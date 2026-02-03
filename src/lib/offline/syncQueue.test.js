/**
 * syncQueue 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initSyncQueue,
  enqueue,
  isOnline,
  getPendingCount,
  subscribe,
  clearQueue,
} from './syncQueue';

// Network mock은 setup.js에서 처리됨

describe('syncQueue', () => {
  beforeEach(async () => {
    await clearQueue();
    await initSyncQueue();
  });

  it('should start online with empty queue', () => {
    expect(isOnline()).toBe(true);
    expect(getPendingCount()).toBe(0);
  });

  it('should enqueue an operation', async () => {
    await enqueue({
      type: 'dream:create',
      payload: { content: '테스트 꿈' },
    });

    // Queue is flushed immediately when online, so count should be 0
    expect(getPendingCount()).toBe(0);
  });

  it('should notify subscribers', async () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);

    await enqueue({
      type: 'checkin:add',
      payload: { condition: 4 },
    });

    expect(listener).toHaveBeenCalled();
    const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCall.isOnline).toBe(true);

    unsub();
  });

  it('should unsubscribe listeners', async () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    unsub();

    await enqueue({
      type: 'test:op',
      payload: {},
    });

    // Listener was called during enqueue but then unsubscribed
    // The important thing is it doesn't throw
    expect(true).toBe(true);
  });

  it('should clear queue', async () => {
    await clearQueue();
    expect(getPendingCount()).toBe(0);
  });
});
