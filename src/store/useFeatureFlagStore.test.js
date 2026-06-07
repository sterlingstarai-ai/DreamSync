import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/adapters', () => ({
  setAIAdapter: vi.fn(),
}));

vi.mock('../lib/adapters/flags/remote', () => ({
  default: {
    getFlags: vi.fn(),
  },
}));

import { setAIAdapter } from '../lib/adapters';
import RemoteFlagsAdapter from '../lib/adapters/flags/remote';
import useFeatureFlagStore from './useFeatureFlagStore';

describe('useFeatureFlagStore remote sync', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    useFeatureFlagStore.getState().resetFlags();
    useFeatureFlagStore.setState({
      platform: 'web',
      lastRemoteSyncAt: null,
      lastRemoteError: null,
    });
  });

  it('remote 모드에서는 서버 플래그를 받아와 edge AI 상태를 동기화한다', async () => {
    vi.stubEnv('VITE_FLAGS', 'remote');
    RemoteFlagsAdapter.getFlags.mockResolvedValue({
      edgeAI: true,
      mockAI: false,
      devMode: true,
    });

    const flags = await useFeatureFlagStore.getState().refreshRemoteFlags('user-1');

    expect(RemoteFlagsAdapter.getFlags).toHaveBeenCalledWith('user-1');
    expect(flags.edgeAI).toBe(true);
    expect(useFeatureFlagStore.getState().flags.devMode).toBe(true);
    expect(useFeatureFlagStore.getState().lastRemoteSyncAt).toEqual(expect.any(Number));
    expect(useFeatureFlagStore.getState().lastRemoteError).toBeNull();
    expect(setAIAdapter).toHaveBeenCalledWith('edge');
  });

  it('local 모드에서는 remote fetch를 건너뛴다', async () => {
    vi.stubEnv('VITE_FLAGS', 'local');

    const flags = await useFeatureFlagStore.getState().refreshRemoteFlags('user-2');

    expect(RemoteFlagsAdapter.getFlags).not.toHaveBeenCalled();
    expect(flags).toEqual(useFeatureFlagStore.getState().flags);
  });

  it('remote sync 실패 시 기존 플래그를 유지하고 오류를 남긴다', async () => {
    vi.stubEnv('VITE_FLAGS', 'remote');
    useFeatureFlagStore.getState().setFlag('devMode', true);
    RemoteFlagsAdapter.getFlags.mockRejectedValue(new Error('network down'));

    const flags = await useFeatureFlagStore.getState().refreshRemoteFlags('user-3');

    expect(flags.devMode).toBe(true);
    expect(useFeatureFlagStore.getState().flags.devMode).toBe(true);
    expect(useFeatureFlagStore.getState().lastRemoteError).toBe('network down');
  });
});
