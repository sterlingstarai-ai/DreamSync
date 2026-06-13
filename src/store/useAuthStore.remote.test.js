import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bootstrapRemoteAccount: vi.fn(),
  api: {
    name: 'supabase',
    isConfigured: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('../lib/adapters/api', () => ({
  getAPIAdapter: () => mocks.api,
}));

vi.mock('../lib/sync/bootstrap', () => ({
  bootstrapRemoteAccount: (...args) => mocks.bootstrapRemoteAccount(...args),
}));

import useAuthStore from './useAuthStore';

function supabaseAuthData({ id, email }) {
  return {
    user: {
      id,
      email,
      created_at: '2026-03-07T08:00:00.000Z',
      user_metadata: {},
    },
    session: {
      access_token: `${id}-token`,
      user: {
        id,
        email,
        created_at: '2026-03-07T08:00:00.000Z',
        user_metadata: {},
      },
    },
  };
}

describe('useAuthStore remote auth bootstrap', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND', 'supabase');
    useAuthStore.getState().reset();
    vi.clearAllMocks();
    mocks.api.isConfigured.mockReturnValue(true);
    mocks.api.signOut.mockResolvedValue(undefined);
    mocks.bootstrapRemoteAccount.mockResolvedValue({ mode: 'noop' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not promote a previous Supabase user into the next remote login', async () => {
    useAuthStore.setState({
      user: {
        id: 'remote-a',
        email: 'a@example.com',
        authProvider: 'supabase',
        settings: { theme: 'light' },
      },
      isAuthenticated: false,
    });
    mocks.api.signIn.mockResolvedValue(supabaseAuthData({
      id: 'remote-b',
      email: 'b@example.com',
    }));

    const result = await useAuthStore.getState().signIn({
      email: 'b@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(mocks.bootstrapRemoteAccount).toHaveBeenCalledWith({
      previousUserId: null,
      allowLocalPromotion: false,
      nextUserId: 'remote-b',
    });
    expect(useAuthStore.getState().user.id).toBe('remote-b');
    expect(useAuthStore.getState().user.settings.theme).toBe('dark');
  });

  it('allows local guest data promotion into a real remote account', async () => {
    useAuthStore.setState({
      user: {
        id: 'guest-local',
        email: 'guest@dreamsync.app',
        authProvider: 'local',
        settings: { theme: 'light' },
      },
      isAuthenticated: false,
    });
    mocks.api.signUp.mockResolvedValue(supabaseAuthData({
      id: 'remote-real',
      email: 'real@example.com',
    }));

    const result = await useAuthStore.getState().signUp({
      email: 'real@example.com',
      password: 'password123',
      name: 'Real User',
    });

    expect(result.success).toBe(true);
    expect(mocks.bootstrapRemoteAccount).toHaveBeenCalledWith({
      previousUserId: 'guest-local',
      allowLocalPromotion: true,
      nextUserId: 'remote-real',
    });
    expect(useAuthStore.getState().user.settings.theme).toBe('light');
  });

  it('does not persist authenticated state when bootstrap fails', async () => {
    mocks.api.signIn.mockResolvedValue(supabaseAuthData({
      id: 'remote-b',
      email: 'b@example.com',
    }));
    mocks.bootstrapRemoteAccount.mockRejectedValue(new Error('bootstrap failed'));

    const result = await useAuthStore.getState().signIn({
      email: 'b@example.com',
      password: 'password123',
    });

    expect(result).toEqual({ success: false, error: 'bootstrap failed' });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(mocks.api.signOut).toHaveBeenCalled();
  });
});
