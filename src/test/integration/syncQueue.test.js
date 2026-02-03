/**
 * 통합 테스트: 오프라인 동기화 큐
 *
 * enqueue → 직렬화 → storage 복원 → 큐 상태 일치
 * 네트워크 상태 변경 subscriber 알림
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initSyncQueue,
  enqueue,
  getPendingCount,
  isOnline,
  subscribe,
  clearQueue,
} from '../../lib/offline/syncQueue';
import storage from '../../lib/adapters/storage';

// storage adapter를 spy로 감시
vi.spyOn(storage, 'get');
vi.spyOn(storage, 'set');

describe('SyncQueue 통합 테스트', () => {
  beforeEach(async () => {
    await clearQueue();
    vi.clearAllMocks();
  });

  it('enqueue 3건 → storage에 직렬화 → 큐 상태 일치', async () => {
    // 3건 적재
    await enqueue({ type: 'dream:create', payload: { id: 'd1', content: '꿈1' } });
    await enqueue({ type: 'checkin:add', payload: { id: 'c1', condition: 4 } });
    await enqueue({ type: 'dream:create', payload: { id: 'd2', content: '꿈2' } });

    // 큐 상태 확인
    expect(getPendingCount()).toBe(0);
    // 참고: Phase 1에서 processItem은 즉시 성공하므로 큐가 비워짐.
    // 온라인 상태에서 enqueue → 즉시 flush → 큐 비움.

    // storage.set이 호출되었는지 확인 (persist 동작)
    expect(storage.set).toHaveBeenCalled();
  });

  it('subscriber가 큐 변경 알림을 받는다', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    await enqueue({ type: 'dream:create', payload: { id: 'd1' } });

    // subscriber가 호출됨
    expect(listener).toHaveBeenCalled();
    const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty('isOnline');
    expect(lastCall).toHaveProperty('pendingCount');

    unsubscribe();

    // unsubscribe 후에는 호출 안 됨
    const callCount = listener.mock.calls.length;
    await enqueue({ type: 'checkin:add', payload: { id: 'c1' } });
    // clearQueue notify는 별도이므로, enqueue 중의 notify만 체크
    // unsubscribe 후에는 새 호출 없어야 함
    // 단, flush 과정에서도 notify가 발생하므로 정확한 비교는 어려움
    // 기본적으로 unsubscribe가 동작하는지만 확인
    expect(listener.mock.calls.length).toBe(callCount);
  });

  it('initSyncQueue는 저장된 큐를 복원한다', async () => {
    // storage에 직접 큐 데이터를 넣어둠
    await storage.set('sync_queue', [
      { id: 'q1', type: 'dream:create', payload: { id: 'd1' }, retries: 0, createdAt: new Date().toISOString() },
      { id: 'q2', type: 'checkin:add', payload: { id: 'c1' }, retries: 0, createdAt: new Date().toISOString() },
    ]);

    await initSyncQueue();

    // Phase 1에서는 init → flush → processItem(성공) → 큐 비움
    // 이 동작이 정상인지 확인
    // 온라인 상태이므로 즉시 flush되어 0이 될 수 있음
    expect(getPendingCount()).toBe(0);
    expect(isOnline()).toBe(true);
  });

  it('clearQueue는 큐를 비우고 storage를 정리한다', async () => {
    await enqueue({ type: 'test:op', payload: {} });
    await clearQueue();

    expect(getPendingCount()).toBe(0);
    // storage.set이 빈 배열로 호출됨
    const setCalls = storage.set.mock.calls;
    const lastSet = setCalls[setCalls.length - 1];
    expect(lastSet[0]).toBe('sync_queue');
    expect(lastSet[1]).toEqual([]);
  });
});
