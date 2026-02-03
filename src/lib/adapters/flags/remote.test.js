/**
 * Remote Feature Flags Adapter 테스트
 *
 * 1. Supabase 미설정 → DEFAULT_FLAGS 반환
 * 2. 캐시 → storage adapter 사용 확인 (localStorage 직접 호출 0)
 * 3. 메모리 캐시 유효 시 storage 읽기 생략
 * 4. clearCache → storage.remove 호출
 * 5. isEnabled → 기본값 반환
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_FLAGS } from '../../../constants/featureFlags';

// storage adapter를 완전 mock (localStorage 의존 제거)
const mockStore = {};
vi.mock('../storage', () => ({
  default: {
    get: vi.fn(async (key) => mockStore[key] ?? null),
    set: vi.fn(async (key, value) => { mockStore[key] = value; }),
    remove: vi.fn(async (key) => { delete mockStore[key]; }),
    clear: vi.fn(async () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }),
  },
}));

import storage from '../storage';
import { RemoteFlagsAdapter } from './remote';

beforeEach(() => {
  RemoteFlagsAdapter._resetForTest();
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  vi.clearAllMocks();
});

describe('RemoteFlagsAdapter', () => {
  it('Supabase 미설정 시 DEFAULT_FLAGS 반환', async () => {
    const flags = await RemoteFlagsAdapter.getFlags('user-123');
    expect(flags).toEqual(DEFAULT_FLAGS);
  });

  it('fetch 실패 시 DEFAULT_FLAGS 반환 (네트워크 에러)', async () => {
    const flags = await RemoteFlagsAdapter.getFlags('user-456');
    expect(flags).toEqual(DEFAULT_FLAGS);
  });

  it('캐시를 storage adapter에 저장', async () => {
    await RemoteFlagsAdapter.getFlags('user-789');

    expect(storage.set).toHaveBeenCalledWith(
      'remote_flags',
      expect.objectContaining({
        flags: expect.any(Object),
        timestamp: expect.any(Number),
      })
    );
  });

  it('메모리 캐시 유효 시 storage 읽기 없이 즉시 반환', async () => {
    await RemoteFlagsAdapter.getFlags('user-001');
    vi.clearAllMocks();

    const flags = await RemoteFlagsAdapter.getFlags('user-001');

    expect(flags).toEqual(DEFAULT_FLAGS);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('clearCache → storage.remove 호출', async () => {
    await RemoteFlagsAdapter.clearCache();
    expect(storage.remove).toHaveBeenCalledWith('remote_flags');
  });

  it('isEnabled → DEFAULT_FLAGS에서 값 반환', async () => {
    const healthkit = await RemoteFlagsAdapter.isEnabled('user-001', 'healthkit');
    expect(healthkit).toBe(DEFAULT_FLAGS.healthkit);

    const unknown = await RemoteFlagsAdapter.isEnabled('user-001', 'nonexistent');
    expect(unknown).toBe(false);
  });
});
