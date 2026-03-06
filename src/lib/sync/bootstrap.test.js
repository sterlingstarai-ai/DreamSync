import { beforeEach, describe, expect, it, vi } from 'vitest';
import useCheckInStore from '../../store/useCheckInStore';
import useCoachPlanStore from '../../store/useCoachPlanStore';
import useDreamStore from '../../store/useDreamStore';
import useForecastStore from '../../store/useForecastStore';
import useSymbolStore from '../../store/useSymbolStore';

const mocks = vi.hoisted(() => ({
  pullBootstrapData: vi.fn(),
  queueUpsert: vi.fn(),
}));

vi.mock('../adapters/api', () => ({
  getAPIAdapter: () => ({
    name: 'supabase',
    pullBootstrapData: mocks.pullBootstrapData,
  }),
}));

vi.mock('../offline/syncHelpers', () => ({
  queueUpsert: (...args) => mocks.queueUpsert(...args),
}));

describe('bootstrapRemoteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useForecastStore.getState().reset();
    useSymbolStore.getState().reset();
    useCoachPlanStore.getState().reset();
  });

  it('pushes local guest data to remote account when remote is empty', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useDreamStore.setState({
      dreams: [
        {
          id: 'dream-1',
          userId: 'guest-1',
          content: '테스트 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
          analysis: {
            symbols: [{ name: '바다', meaning: '감정' }],
          },
        },
      ],
    });
    useSymbolStore.setState({
      symbols: [
        {
          id: 'symbol-1',
          userId: 'guest-1',
          name: '바다',
          meaning: '휴식',
          count: 1,
          dreamIds: ['dream-1'],
          firstSeen: '2026-03-07',
          lastSeen: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
          sourceDeviceId: 'device-a',
        },
      ],
    });

    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: 'guest-1',
      nextUserId: 'remote-1',
    });

    expect(result).toEqual({ mode: 'push_local' });
    expect(useDreamStore.getState().dreams[0].userId).toBe('remote-1');
    expect(useSymbolStore.getState().symbols[0].userId).toBe('remote-1');
    expect(mocks.queueUpsert).toHaveBeenCalledWith(
      'dreams',
      expect.objectContaining({ id: 'dream-1', userId: 'remote-1' }),
    );
    expect(mocks.queueUpsert).toHaveBeenCalledWith(
      'personal_symbols',
      expect.objectContaining({ id: 'symbol-1', userId: 'remote-1' }),
    );
  });

  it('hydrates remote data locally and recomputes derived symbol counts', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [
        {
          id: 'dream-1',
          userId: 'remote-1',
          content: '첫 번째 꿈',
          date: '2026-03-06',
          createdAt: '2026-03-06T08:00:00.000Z',
          updatedAt: '2026-03-06T08:30:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
          analysis: {
            symbols: [{ name: '바다', meaning: '감정' }],
          },
        },
        {
          id: 'dream-2',
          userId: 'remote-1',
          content: '두 번째 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:30:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
          analysis: {
            symbols: [{ name: '바다', meaning: '다른 의미' }],
          },
        },
      ],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [
        {
          id: 'symbol-1',
          userId: 'remote-1',
          name: '바다',
          meaning: '내가 해석한 바다',
          count: 99,
          dreamIds: ['legacy'],
          firstSeen: '2026-01-01',
          lastSeen: '2026-01-01',
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          sourceDeviceId: 'device-a',
        },
      ],
      coach_plans: [],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: null,
      nextUserId: 'remote-1',
    });

    expect(result).toEqual({ mode: 'pull_remote' });
    expect(useDreamStore.getState().dreams).toHaveLength(2);
    expect(useSymbolStore.getState().symbols[0]).toMatchObject({
      id: 'symbol-1',
      name: '바다',
      meaning: '내가 해석한 바다',
      count: 2,
      dreamIds: ['dream-1', 'dream-2'],
    });
    expect(mocks.queueUpsert).not.toHaveBeenCalled();
  });
});
