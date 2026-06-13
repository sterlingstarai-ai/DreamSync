/**
 * syncQueue 동시성/내구성 테스트
 *
 * 라이브(느린) 원격 어댑터를 모사해, 적대적 리뷰에서 확정된 두 데이터 유실
 * 결함이 재발하지 않는지 고정한다:
 *  - flush 진행 중(in-flight) 들어온 항목이 통째 clear로 사라지는 문제 (#2)
 *  - 실패가 MAX_RETRIES에 도달하면 dead-letter 없이 영구 폐기 + poison row가
 *    배치 전체를 끌고 죽는 문제 (#7)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  /** @type {Array<() => void>} */
  const resolvers = [];
  /** @type {Array<Array<string>>} */
  const calls = [];
  return {
    resolvers,
    calls,
    api: {
      name: 'supabase',
      isConfigured: () => true,
      // 각 호출은 수동으로 resolve 가능한 promise를 반환(=느린 네트워크 모사).
      processSyncBatch: vi.fn((batch) => {
        calls.push(batch.map((item) => item.recordId));
        return new Promise((resolve) => {
          resolvers.push((result) => resolve(
            result || { succeeded: batch.map((item) => item.id), failed: [] },
          ));
        });
      }),
    },
  };
});

vi.mock('../adapters/api', () => ({
  getAPIAdapter: () => mocks.api,
}));

import {
  initSyncQueue,
  disposeSyncQueue,
  enqueue,
  flush,
  getPendingCount,
  getDeadLetterCount,
  clearQueue,
} from './syncQueue';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function settleAll(result) {
  const pending = mocks.resolvers.splice(0, mocks.resolvers.length);
  pending.forEach((resolve) => resolve(result));
}

describe('syncQueue 동시성/내구성', () => {
  beforeEach(async () => {
    await disposeSyncQueue();
    await clearQueue();
    mocks.calls.length = 0;
    mocks.resolvers.length = 0;
    mocks.api.processSyncBatch.mockClear();
    await initSyncQueue();
  });

  afterEach(async () => {
    settleAll();
    await tick();
    await disposeSyncQueue();
    await clearQueue();
  });

  it('flush 진행 중 enqueue된 항목을 잃지 않고 이어서 동기화한다', async () => {
    // A enqueue → 첫 flush가 느린 processBatch를 await하는 동안
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'A', payload: { id: 'A', updatedAt: '2026-03-07T00:00:00.000Z' } });
    await tick();
    expect(mocks.api.processSyncBatch).toHaveBeenCalledTimes(1);

    // B를 in-flight 도중 enqueue (isFlushing 가드로 즉시 flush는 no-op, items에 적재)
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'B', payload: { id: 'B', updatedAt: '2026-03-07T00:01:00.000Z' } });
    await tick();
    expect(mocks.api.processSyncBatch).toHaveBeenCalledTimes(1); // 아직 A 배치만

    // A 배치 성공 → A 제거 + 진행했으므로 재flush로 B 배치 처리
    mocks.resolvers.shift()();
    await tick();
    await tick();
    expect(mocks.api.processSyncBatch).toHaveBeenCalledTimes(2);

    // B 배치 성공
    mocks.resolvers.shift()();
    await tick();
    await tick();

    // 두 항목 모두 전송됨(B가 조용히 사라지지 않음)
    expect(mocks.calls).toEqual([['A'], ['B']]);
    expect(getPendingCount()).toBe(0);
    expect(getDeadLetterCount()).toBe(0);
  });

  it('MAX_RETRIES 도달 항목을 폐기하지 않고 dead-letter로 보존한다', async () => {
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'X', payload: { id: 'X', updatedAt: '2026-03-07T00:00:00.000Z' } });
    await tick();

    const failOnce = async () => {
      const resolve = mocks.resolvers.shift();
      resolve({ succeeded: [], failed: [{ id: latestItemId(), error: new Error('boom') }] });
      await tick();
      await tick();
    };

    await failOnce(); // retries 1, 큐 유지
    expect(getPendingCount()).toBe(1);
    expect(getDeadLetterCount()).toBe(0);

    void flush();
    await tick();
    await failOnce(); // retries 2, 큐 유지
    expect(getPendingCount()).toBe(1);

    void flush();
    await tick();
    await failOnce(); // retries 3 → dead-letter

    expect(getPendingCount()).toBe(0);
    expect(getDeadLetterCount()).toBe(1);
  });

  it('한 배치 안에서 poison row만 격리하고 정상 항목은 동기화한다', async () => {
    // A를 in-flight로 만들고, 그 사이 B·C를 적재 → A 완료 후 재flush가 [B,C]를 한 배치로 처리
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'A', payload: { id: 'A', updatedAt: '2026-03-07T00:00:00.000Z' } });
    await tick();
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'B', payload: { id: 'B', updatedAt: '2026-03-07T00:01:00.000Z' } });
    void enqueue({ entity: 'dreams', op: 'upsert', recordId: 'C', payload: { id: 'C', updatedAt: '2026-03-07T00:02:00.000Z' } });
    await tick();

    // A 배치 성공 → 재flush가 [B,C] 배치 생성
    mocks.resolvers.shift()();
    await tick();
    await tick();
    expect(mocks.calls).toEqual([['A'], ['B', 'C']]);

    // [B,C] 배치에서 B만 성공, C는 실패(poison)
    const bcResolve = mocks.resolvers.shift();
    const ids = currentBatchIds();
    bcResolve({ succeeded: [ids.B], failed: [{ id: ids.C, error: new Error('poison') }] });
    await tick();
    await tick();

    // A·B는 동기화 완료, C만 재시도 큐에 남음(전체가 끌려 죽지 않음)
    expect(getPendingCount()).toBe(1);
    expect(getDeadLetterCount()).toBe(0);
  });
});

// processBatch가 받은 가장 최근 배치의 큐 item.id를 추출하기 위한 헬퍼.
// (item.id는 enqueue 내부에서 생성되므로 mock이 받은 batch에서 역참조한다.)
function latestItemId() {
  const last = mocks.api.processSyncBatch.mock.calls.at(-1)?.[0] || [];
  return last[0]?.id;
}

function currentBatchIds() {
  const last = mocks.api.processSyncBatch.mock.calls.at(-1)?.[0] || [];
  return Object.fromEntries(last.map((item) => [item.recordId, item.id]));
}
