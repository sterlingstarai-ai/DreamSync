import { beforeEach, describe, expect, it } from 'vitest';
import useGoalStore, { DEFAULT_WEEKLY_GOALS } from './useGoalStore';
import { getDaysAgo } from '../lib/utils/date';

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
        { date: getDaysAgo(1), sleep: { duration: 480 } },
        { date: getDaysAgo(2), sleep: { duration: 420 } },
        { date: getDaysAgo(3), sleep: { duration: 360 } },
      ],
      dreams: [
        { date: getDaysAgo(0) },
        { date: getDaysAgo(1) },
        { date: getDaysAgo(2) },
        { date: getDaysAgo(3) },
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
        { date: getDaysAgo(1), sleep: { duration: 480 } },
        { date: getDaysAgo(2), sleep: { duration: 450 } },
        { date: getDaysAgo(3), sleep: { duration: 420 } },
        { date: getDaysAgo(4), sleep: { duration: 480 } },
        { date: getDaysAgo(5), sleep: { duration: 450 } },
        { date: getDaysAgo(6), sleep: { duration: 420 } },
        { date: getDaysAgo(7), sleep: { duration: 450 } },
        { date: getDaysAgo(8), sleep: { duration: 480 } },
      ],
      dreams: [
        { date: getDaysAgo(1) },
        { date: getDaysAgo(2) },
        { date: getDaysAgo(3) },
        { date: getDaysAgo(4) },
        { date: getDaysAgo(5) },
        { date: getDaysAgo(6) },
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
      logs: [{ date: getDaysAgo(1), sleep: { duration: 420 } }],
      dreams: [{ date: getDaysAgo(1) }],
    });

    const goals = useGoalStore.getState().getGoals('user-1');
    expect(applied).toEqual(goals);
  });
});
