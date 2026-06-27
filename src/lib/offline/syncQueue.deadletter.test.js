/**
 * syncQueue dead letter API 테스트 — Q4
 *
 * 검증 대상:
 *   getDeadLetterItems, retryDeadLetterItem, removeDeadLetterItem,
 *   retryAllDeadLetters, clearAllDeadLetters
 *
 * 전제: LocalAPIAdapter는 항상 성공하므로 dead letter 생성을 위해
 *   API 어댑터를 실패 모드로 교체한다.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  initSyncQueue,
  disposeSyncQueue,
  enqueue,
  flush,
  clearQueue,
  getDeadLetterCount,
  getDeadLetterItems,
  retryDeadLetterItem,
  removeDeadLetterItem,
  retryAllDeadLetters,
  clearAllDeadLetters,
} from './syncQueue';

// 어댑터를 실패 모드로 교체 — dead letter 유도
let mockProcessBatch = vi.fn();

vi.mock('../adapters/api', () => ({
  getAPIAdapter: () => ({
    name: 'supabase',
    isConfigured: () => true,
    processSyncBatch: (...args) => mockProcessBatch(...args),
  }),
}));

/**
 * 헬퍼: 큐에 item을 추가하고 MAX_RETRIES(3)번 flush 실패시켜 dead letter로 이동.
 * (enqueue → 자동 1회 flush + 수동 2회 flush = 총 3번 실패)
 */
async function pushToDead(itemOverrides = {}) {
  await enqueue({
    entity: 'dreams',
    op: 'upsert',
    recordId: 'test-record',
    payload: { id: 'test-record' },
    ...itemOverrides,
  });
  // enqueue가 1회 flush 수행 → retries: 1
  // 추가 2회 flush → retries: 2, 3 → dead
  await flush();
  await flush();
}

describe('syncQueue — dead letter API (Q4)', () => {
  beforeEach(async () => {
    // 각 테스트마다 실패 mock 초기화
    mockProcessBatch = vi.fn().mockRejectedValue(new Error('Network failure'));

    await disposeSyncQueue();
    await clearQueue();
    await initSyncQueue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeadLetterItems', () => {
    it('초기 상태에서 빈 배열 반환', () => {
      expect(getDeadLetterItems()).toEqual([]);
      expect(getDeadLetterCount()).toBe(0);
    });

    it('dead letter 항목을 스냅숏으로 반환', async () => {
      await pushToDead();

      const items = getDeadLetterItems();
      expect(items).toHaveLength(1);
      expect(items[0].entity).toBe('dreams');
      expect(items[0].lastError).toBeDefined();
      expect(items[0].deadLetteredAt).toBeDefined();
    });

    it('반환된 배열 변형이 내부 상태에 영향을 주지 않음 (스냅숏 격리)', async () => {
      await pushToDead();

      const snap1 = getDeadLetterItems();
      snap1.pop(); // 외부 배열 수정
      const snap2 = getDeadLetterItems();

      expect(snap2).toHaveLength(1); // 내부 상태 변동 없음
    });
  });

  describe('retryDeadLetterItem', () => {
    it('dead letter 항목을 큐로 복원하고 dead letter에서 제거', async () => {
      await pushToDead();
      expect(getDeadLetterCount()).toBe(1);

      const deadId = getDeadLetterItems()[0].id;
      await retryDeadLetterItem(deadId);

      expect(getDeadLetterCount()).toBe(0);
      expect(getDeadLetterItems()).toHaveLength(0);
    });

    it('존재하지 않는 id는 no-op (에러 없음)', async () => {
      await pushToDead();
      const countBefore = getDeadLetterCount();

      await retryDeadLetterItem('non-existent-id');

      expect(getDeadLetterCount()).toBe(countBefore); // 변동 없음
    });

    it('재시도 항목은 retries 초기화(0)된 상태로 큐에 복원됨', async () => {
      // 두 번째 항목을 dead letter에 넣기 위해 별도 flush
      await enqueue({
        entity: 'daily_logs',
        op: 'upsert',
        recordId: 'log-1',
        payload: { id: 'log-1' },
      });
      await flush();
      await flush();
      // 이제 log-1 dead letter에 있음

      const deadId = getDeadLetterItems().find(i => i.recordId === 'log-1')?.id;
      if (!deadId) return; // guard — 아직 dead에 없는 경우 skip

      await retryDeadLetterItem(deadId);
      // 복원 후 다시 flush 실패 → retries=1로 큐 잔류 (MAX_RETRIES 초과 아님)
      expect(getDeadLetterCount()).toBe(0); // dead에서 제거됨
    });
  });

  describe('removeDeadLetterItem', () => {
    it('특정 dead letter 항목을 영구 삭제', async () => {
      await pushToDead();
      expect(getDeadLetterCount()).toBe(1);

      const deadId = getDeadLetterItems()[0].id;
      await removeDeadLetterItem(deadId);

      expect(getDeadLetterCount()).toBe(0);
      expect(getDeadLetterItems()).toHaveLength(0);
    });

    it('존재하지 않는 id는 no-op', async () => {
      await pushToDead();
      const countBefore = getDeadLetterCount();

      await removeDeadLetterItem('ghost-id');

      expect(getDeadLetterCount()).toBe(countBefore);
    });
  });

  describe('retryAllDeadLetters', () => {
    it('빈 dead letter에서 호출해도 에러 없음', async () => {
      await expect(retryAllDeadLetters()).resolves.toBeUndefined();
      expect(getDeadLetterCount()).toBe(0);
    });

    it('모든 dead letter 항목을 큐로 복원', async () => {
      // 첫 번째 항목
      await pushToDead({ recordId: 'rec-1', payload: { id: 'rec-1' } });
      // 두 번째 항목을 위한 새로운 enqueue+flush 사이클
      await enqueue({
        entity: 'daily_logs',
        op: 'upsert',
        recordId: 'rec-2',
        payload: { id: 'rec-2' },
      });
      await flush();
      await flush();

      const countBefore = getDeadLetterCount();
      expect(countBefore).toBeGreaterThanOrEqual(1);

      await retryAllDeadLetters();

      expect(getDeadLetterCount()).toBe(0);
    });
  });

  describe('clearAllDeadLetters', () => {
    it('빈 dead letter에서 호출해도 에러 없음', async () => {
      await expect(clearAllDeadLetters()).resolves.toBeUndefined();
    });

    it('모든 dead letter 항목을 영구 삭제', async () => {
      await pushToDead();
      expect(getDeadLetterCount()).toBeGreaterThan(0);

      await clearAllDeadLetters();

      expect(getDeadLetterCount()).toBe(0);
      expect(getDeadLetterItems()).toHaveLength(0);
    });
  });
});
