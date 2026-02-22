import { describe, expect, it } from 'vitest';
import { buildGoalRecoveryPlan, getDaysLeftInWeek } from './goalRecoveryService';

describe('goalRecoveryService', () => {
  it('returns no recovery plan when all goals are achieved', () => {
    const result = buildGoalRecoveryPlan({
      daysLeftInWeek: 4,
      goalProgress: {
        progress: {
          checkInDays: { current: 5, target: 5, achieved: true },
          dreamCount: { current: 4, target: 4, achieved: true },
          avgSleepHours: { current: 7.2, target: 7, achieved: true },
        },
      },
    });

    expect(result.isNeeded).toBe(false);
    expect(result.tasks).toEqual([]);
    expect(result.deficits).toEqual([]);
  });

  it('builds high-risk recovery tasks when pace is behind', () => {
    const result = buildGoalRecoveryPlan({
      daysLeftInWeek: 2,
      checkedInToday: false,
      todayDreamCount: 0,
      goalProgress: {
        progress: {
          checkInDays: { current: 2, target: 5, achieved: false },
          dreamCount: { current: 1, target: 4, achieved: false },
          avgSleepHours: { current: 6, target: 7.2, achieved: false },
        },
      },
    });

    expect(result.isNeeded).toBe(true);
    expect(result.riskLevel).toBe('high');
    expect(result.deficits.length).toBe(3);
    expect(result.tasks.map(task => task.source)).toContain('recovery');
    expect(result.tasks.map(task => task.title)).toContain('오늘 저녁 체크인 완료하기');
    expect(result.tasks.map(task => task.title)).toContain('아침 기억이 남아있을 때 꿈 1개 기록하기');
  });

  it('calculates days left in week including today', () => {
    const daysLeft = getDaysLeftInWeek(new Date('2026-02-18T09:00:00'));
    expect(daysLeft).toBe(5); // 수요일 기준: 수/목/금/토/일
  });
});
