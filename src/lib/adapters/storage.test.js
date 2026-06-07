import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('storage adapter selection', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    globalThis.__setCapacitorPlatform('web');
  });

  it('web 환경에서는 localStorage adapter를 사용한다', async () => {
    const { default: storage } = await import('./storage');

    await storage.set('auth', { token: 'web-token' });

    expect(localStorage.getItem('dreamsync_auth')).toBe(JSON.stringify({ token: 'web-token' }));
    expect(globalThis.__capacitorPreferencesMock.set).not.toHaveBeenCalled();
  });

  it('native 환경에서는 Capacitor Preferences adapter를 사용한다', async () => {
    globalThis.__setCapacitorPlatform('ios');
    const { default: storage } = await import('./storage');

    await storage.set('auth', { token: 'native-token' });

    expect(globalThis.__capacitorPreferencesMock.set).toHaveBeenCalledWith({
      key: 'dreamsync_auth',
      value: JSON.stringify({ token: 'native-token' }),
    });
  });

  it('zustandStorage는 native persisted payload를 그대로 복원한다', async () => {
    globalThis.__setCapacitorPlatform('android');
    globalThis.__capacitorPreferencesMock.get.mockResolvedValueOnce({
      value: JSON.stringify({ state: { token: 'native-session' } }),
    });
    const { zustandStorage } = await import('./storage');

    const restored = await zustandStorage.getItem('auth');

    expect(restored).toBe(JSON.stringify({ state: { token: 'native-session' } }));
    expect(globalThis.__capacitorPreferencesMock.get).toHaveBeenCalledWith({
      key: 'dreamsync_auth',
    });
  });
});
