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
      allowLocalPromotion: true,
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

  it('does not promote a previous non-guest account into a new empty remote account', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useDreamStore.setState({
      dreams: [
        {
          id: 'dream-a',
          userId: 'remote-a',
          content: 'A 계정 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
          deletedAt: null,
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
      previousUserId: 'remote-a',
      nextUserId: 'remote-b',
      allowLocalPromotion: false,
    });

    expect(result).toEqual({ mode: 'skip_local_promotion' });
    expect(useDreamStore.getState().dreams).toEqual([
      expect.objectContaining({ id: 'dream-a', userId: 'remote-a' }),
    ]);
    expect(mocks.queueUpsert).not.toHaveBeenCalled();
  });

  it('pulls remote account data even when another local account has data', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useDreamStore.setState({
      dreams: [
        {
          id: 'dream-a',
          userId: 'remote-a',
          content: 'A 계정 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
    });
    useCheckInStore.setState({
      logs: [
        {
          id: 'log-a',
          userId: 'remote-a',
          date: '2026-03-07',
          condition: 3,
          emotions: [],
          stressLevel: 3,
          events: [],
          createdAt: '2026-03-07T20:00:00.000Z',
          updatedAt: '2026-03-07T20:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
    });
    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [
        {
          id: 'dream-b',
          userId: 'remote-b',
          content: 'B 계정 꿈',
          date: '2026-03-08',
          createdAt: '2026-03-08T08:00:00.000Z',
          updatedAt: '2026-03-08T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-b',
        },
      ],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: 'remote-a',
      nextUserId: 'remote-b',
    });

    expect(result).toEqual({ mode: 'pull_remote' });
    expect(useDreamStore.getState().dreams).toEqual([
      expect.objectContaining({ id: 'dream-a', userId: 'remote-a' }),
      expect.objectContaining({ id: 'dream-b', userId: 'remote-b' }),
    ]);
    expect(useCheckInStore.getState().logs).toEqual([
      expect.objectContaining({ id: 'log-a', userId: 'remote-a' }),
    ]);
    expect(mocks.queueUpsert).not.toHaveBeenCalled();
  });

  it('merges the current user slice without dropping unsynced local-only records', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useDreamStore.setState({
      dreams: [
        {
          // local-only, never synced (no remote counterpart) — must survive the pull
          id: 'local-only-b',
          userId: 'remote-b',
          content: '아직 동기화 안 된 B 꿈',
          date: '2026-03-01',
          createdAt: '2026-03-01T08:00:00.000Z',
          updatedAt: '2026-03-01T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-b',
        },
        {
          id: 'dream-a',
          userId: 'remote-a',
          content: 'A 계정 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
    });
    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [
        {
          id: 'fresh-b',
          userId: 'remote-b',
          content: '새 B 꿈',
          date: '2026-03-08',
          createdAt: '2026-03-08T08:00:00.000Z',
          updatedAt: '2026-03-08T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-b',
        },
      ],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: null,
      nextUserId: 'remote-b',
    });

    expect(result).toEqual({ mode: 'pull_remote_merge_local' });
    const dreams = useDreamStore.getState().dreams;
    // other-user row untouched, remote row pulled in, AND the unsynced local-only
    // record preserved (no silent disappearance).
    expect(dreams).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'dream-a', userId: 'remote-a' }),
      expect.objectContaining({ id: 'fresh-b', userId: 'remote-b' }),
      expect.objectContaining({ id: 'local-only-b', userId: 'remote-b' }),
    ]));
    expect(dreams).toHaveLength(3);
  });

  it('prefers the locally-newer edit over an older remote row on the same id', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useCheckInStore.setState({
      logs: [
        {
          id: 'log-1',
          userId: 'remote-b',
          date: '2026-03-07',
          condition: 5,
          emotions: [],
          stressLevel: 2,
          events: [],
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T20:00:00.000Z', // newer than remote
          deletedAt: null,
          sourceDeviceId: 'device-b',
        },
      ],
    });
    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [],
      daily_logs: [
        {
          id: 'log-1',
          userId: 'remote-b',
          date: '2026-03-07',
          condition: 1,
          emotions: [],
          stressLevel: 5,
          events: [],
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T09:00:00.000Z', // older
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    });

    await bootstrapRemoteAccount({ previousUserId: null, nextUserId: 'remote-b' });

    const logs = useCheckInStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ id: 'log-1', condition: 5, stressLevel: 2 }); // local newer wins
  });

  it('promotes guest local data even when the remote account already has data', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useDreamStore.setState({
      dreams: [
        {
          id: 'guest-dream',
          userId: 'guest-1',
          content: '게스트 시절 꿈',
          date: '2026-03-05',
          createdAt: '2026-03-05T08:00:00.000Z',
          updatedAt: '2026-03-05T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
    });
    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [
        {
          id: 'remote-dream',
          userId: 'remote-1',
          content: '기존 계정 꿈',
          date: '2026-03-06',
          createdAt: '2026-03-06T08:00:00.000Z',
          updatedAt: '2026-03-06T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-z',
        },
      ],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: 'guest-1',
      nextUserId: 'remote-1',
      allowLocalPromotion: true,
    });

    expect(result).toEqual({ mode: 'pull_remote_merge_promote' });
    // guest data is reassigned to the real account and queued for upload (not orphaned)
    expect(mocks.queueUpsert).toHaveBeenCalledWith(
      'dreams',
      expect.objectContaining({ id: 'guest-dream', userId: 'remote-1' }),
    );
    const dreams = useDreamStore.getState().dreams;
    expect(dreams).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'remote-dream', userId: 'remote-1' }),
      expect.objectContaining({ id: 'guest-dream', userId: 'remote-1' }),
    ]));
    // no rows left stranded under the old guest id
    expect(dreams.some((dream) => dream.userId === 'guest-1')).toBe(false);
  });

  it('keeps both guest and remote coach plans when promoting into a non-empty account', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    useCoachPlanStore.setState({
      plansByUser: {
        'guest-1': {
          '2026-03-05': {
            id: 'guest-1:2026-03-05',
            userId: 'guest-1',
            date: '2026-03-05',
            tasks: [],
            completionRate: 0,
            createdAt: '2026-03-05T08:00:00.000Z',
            updatedAt: '2026-03-05T08:00:00.000Z',
            deletedAt: null,
            sourceDeviceId: 'device-a',
          },
        },
      },
    });
    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [
        {
          id: 'remote-1:2026-03-06',
          userId: 'remote-1',
          date: '2026-03-06',
          tasks: [],
          completionRate: 0,
          createdAt: '2026-03-06T08:00:00.000Z',
          updatedAt: '2026-03-06T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-z',
        },
      ],
    });

    const result = await bootstrapRemoteAccount({
      previousUserId: 'guest-1',
      nextUserId: 'remote-1',
      allowLocalPromotion: true,
    });

    expect(result).toEqual({ mode: 'pull_remote_merge_promote' });
    const plans = useCoachPlanStore.getState().plansByUser['remote-1'];
    // remote plan merged AND reassigned guest plan kept (not clobbered)
    expect(Object.keys(plans).sort()).toEqual(['2026-03-05', '2026-03-06']);
    expect(useCoachPlanStore.getState().plansByUser['guest-1']).toBeUndefined();
  });

  it('does not resurrect a remotely-deleted symbol and keeps remote-only authored symbols', async () => {
    const { bootstrapRemoteAccount } = await import('./bootstrap');

    mocks.pullBootstrapData.mockResolvedValue({
      dreams: [
        {
          id: 'dream-1',
          userId: 'remote-1',
          content: '물 꿈',
          date: '2026-03-07',
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:30:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
          analysis: { symbols: [{ name: '물', meaning: '감정' }] },
        },
      ],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [
        {
          // user deleted this symbol on another device — tombstone must NOT be resurrected
          id: 'symbol-water',
          userId: 'remote-1',
          name: '물',
          meaning: '오래된 의미',
          count: 1,
          dreamIds: ['dream-1'],
          createdAt: '2026-03-01T08:00:00.000Z',
          updatedAt: '2026-03-09T08:00:00.000Z',
          deletedAt: '2026-03-09T08:00:00.000Z',
          sourceDeviceId: 'device-a',
        },
        {
          // authored symbol with no backing dream — must NOT be dropped
          id: 'symbol-orphan',
          userId: 'remote-1',
          name: '나무',
          meaning: '성장에 대한 나의 해석',
          count: 0,
          dreamIds: [],
          createdAt: '2026-03-02T08:00:00.000Z',
          updatedAt: '2026-03-02T08:00:00.000Z',
          deletedAt: null,
          sourceDeviceId: 'device-a',
        },
      ],
      coach_plans: [],
    });

    await bootstrapRemoteAccount({ previousUserId: null, nextUserId: 'remote-1' });

    const symbols = useSymbolStore.getState().symbols;
    const water = symbols.find((symbol) => symbol.name === '물');
    const tree = symbols.find((symbol) => symbol.name === '나무');

    expect(water?.deletedAt).toBe('2026-03-09T08:00:00.000Z'); // stays deleted
    expect(tree).toMatchObject({ id: 'symbol-orphan', meaning: '성장에 대한 나의 해석' }); // preserved
  });
});
