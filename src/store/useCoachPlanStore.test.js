import { beforeEach, describe, expect, it } from 'vitest';
import useCoachPlanStore from './useCoachPlanStore';
import { getDaysAgo, getTodayString } from '../lib/utils/date';

describe('useCoachPlanStore', () => {
  beforeEach(() => {
    useCoachPlanStore.getState().reset();
  });

  it('creates and returns today plan', () => {
    const today = getTodayString();
    useCoachPlanStore.getState().upsertTodayPlan({
      userId: 'user-1',
      date: today,
      tasks: [
        { id: 't1', title: '호흡 10분', source: 'alert' },
        { id: 't2', title: '물 마시기', source: 'forecast' },
      ],
    });

    const plan = useCoachPlanStore.getState().getPlan('user-1', today);
    expect(plan).toBeDefined();
    expect(plan.tasks).toHaveLength(2);
    expect(plan.completionRate).toBe(0);
  });

  it('preserves completion state when same task title appears again', () => {
    const today = getTodayString();
    useCoachPlanStore.getState().upsertTodayPlan({
      userId: 'user-1',
      date: today,
      tasks: [{ id: 't1', title: '호흡 10분', source: 'alert' }],
    });
    useCoachPlanStore.getState().toggleTask('user-1', today, 't1');

    useCoachPlanStore.getState().upsertTodayPlan({
      userId: 'user-1',
      date: today,
      tasks: [{ id: 'new-id', title: '호흡 10분', source: 'alert' }],
    });

    const plan = useCoachPlanStore.getState().getPlan('user-1', today);
    expect(plan.tasks[0].completed).toBe(true);
    expect(plan.completionRate).toBe(100);
  });

  it('computes recent plan stats', () => {
    const today = getTodayString();
    const yesterday = getDaysAgo(1);

    useCoachPlanStore.getState().upsertTodayPlan({
      userId: 'user-1',
      date: today,
      tasks: [
        { id: 't1', title: '호흡', source: 'alert', completed: true },
        { id: 't2', title: '산책', source: 'forecast', completed: false },
      ],
    });
    useCoachPlanStore.getState().upsertTodayPlan({
      userId: 'user-1',
      date: yesterday,
      tasks: [{ id: 't3', title: '일찍 자기', source: 'goal', completed: true }],
    });

    const stats = useCoachPlanStore.getState().getRecentPlanStats('user-1', 7);
    expect(stats.activeDays).toBe(2);
    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(2);
    expect(stats.completionRate).toBe(67);
  });
});
