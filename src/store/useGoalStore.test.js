import { beforeEach, describe, expect, it } from 'vitest';
import useGoalStore, { DEFAULT_WEEKLY_GOALS } from './useGoalStore';

describe('useGoalStore', () => {
  beforeEach(() => {
    useGoalStore.getState().reset();
  });

  it('returns default goals for a new user', () => {
    const goals = useGoalStore.getState().getGoals('user-1');
    expect(goals).toEqual(DEFAULT_WEEKLY_GOALS);
  });

  it('updates and persists user goals', () => {
    useGoalStore.getState().updateGoals('user-1', {
      checkInDays: 6,
      dreamCount: 5,
      avgSleepHours: 7.5,
    });

    const goals = useGoalStore.getState().getGoals('user-1');
    expect(goals.checkInDays).toBe(6);
    expect(goals.dreamCount).toBe(5);
    expect(goals.avgSleepHours).toBe(7.5);
  });

  it('calculates weekly progress from logs and dreams', () => {
    const progress = useGoalStore.getState().getWeeklyProgress('user-1', {
      logs: [
        { date: '2026-02-17', sleep: { duration: 480 } },
        { date: '2026-02-16', sleep: { duration: 420 } },
        { date: '2026-02-15', sleep: { duration: 360 } },
      ],
      dreams: [
        { date: '2026-02-17' },
        { date: '2026-02-16' },
        { date: '2026-02-15' },
        { date: '2026-02-14' },
      ],
    });

    expect(progress.metrics.checkInDays).toBe(3);
    expect(progress.metrics.dreamCount).toBe(4);
    expect(progress.metrics.avgSleepHours).toBe(7);
    expect(progress.progress.dreamCount.achieved).toBe(true);
  });

  it('suggests realistic next weekly goals from recent data', () => {
    useGoalStore.getState().updateGoals('user-1', {
      checkInDays: 5,
      dreamCount: 4,
      avgSleepHours: 7,
    });

    const suggestion = useGoalStore.getState().getSuggestedGoals('user-1', {
      lookbackDays: 14,
      logs: [
        { date: '2026-02-17', sleep: { duration: 480 } },
        { date: '2026-02-16', sleep: { duration: 450 } },
        { date: '2026-02-15', sleep: { duration: 420 } },
        { date: '2026-02-14', sleep: { duration: 480 } },
        { date: '2026-02-13', sleep: { duration: 450 } },
        { date: '2026-02-12', sleep: { duration: 420 } },
        { date: '2026-02-11', sleep: { duration: 450 } },
        { date: '2026-02-10', sleep: { duration: 480 } },
      ],
      dreams: [
        { date: '2026-02-17' },
        { date: '2026-02-16' },
        { date: '2026-02-15' },
        { date: '2026-02-14' },
        { date: '2026-02-13' },
        { date: '2026-02-12' },
      ],
    });

    expect(suggestion.current.checkInDays).toBe(5);
    expect(suggestion.suggested.checkInDays).toBeGreaterThanOrEqual(3);
    expect(suggestion.suggested.checkInDays).toBeLessThanOrEqual(7);
    expect(suggestion.suggested.dreamCount).toBeGreaterThanOrEqual(2);
    expect(suggestion.suggested.avgSleepHours).toBeGreaterThanOrEqual(6);
    expect(['high', 'medium', 'low']).toContain(suggestion.confidence);
  });

  it('applies suggested goals', () => {
    const applied = useGoalStore.getState().applySuggestedGoals('user-1', {
      lookbackDays: 14,
      logs: [{ date: '2026-02-17', sleep: { duration: 420 } }],
      dreams: [{ date: '2026-02-17' }],
    });

    const goals = useGoalStore.getState().getGoals('user-1');
    expect(applied).toEqual(goals);
  });
});
