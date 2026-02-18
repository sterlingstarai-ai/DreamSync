import { describe, expect, it } from 'vitest';
import { buildCoachPlan, getCoachPlanCompletion } from './coachPlanService';

describe('coachPlanService', () => {
  it('prioritizes alert-based tasks and deduplicates titles', () => {
    const result = buildCoachPlan({
      forecast: {
        suggestions: ['오후에 10분 호흡 또는 스트레칭 루틴 실행하기', '물 자주 마시기'],
      },
      alerts: [
        { id: 'stress-spike', recommendation: '휴식하기' },
        { id: 'sleep-deficit', recommendation: '일찍 자기' },
      ],
    });

    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks[0].source).toBe('alert');
    expect(result.tasks.map(task => task.title)).toContain('물 자주 마시기');
    expect(
      result.tasks.filter(task => task.title === '오후에 10분 호흡 또는 스트레칭 루틴 실행하기').length,
    ).toBe(1);
  });

  it('adds goal-driven tasks when weekly goals are behind', () => {
    const result = buildCoachPlan({
      goalProgress: {
        progress: {
          checkInDays: { achieved: false },
          dreamCount: { achieved: false },
          avgSleepHours: { achieved: false, target: 7.5 },
        },
      },
      checkedInToday: false,
      todayDreamCount: 0,
    });

    const titles = result.tasks.map(task => task.title);
    expect(titles).toContain('오늘 저녁 체크인 완료하기');
    expect(titles).toContain('아침 기억이 남아있을 때 꿈 1개 기록하기');
    expect(titles).toContain('오늘 수면 7.5시간 목표 지키기');
  });

  it('calculates completion ratio', () => {
    const completion = getCoachPlanCompletion([
      { id: '1', completed: true },
      { id: '2', completed: false },
      { id: '3', completed: true },
    ]);

    expect(completion.total).toBe(3);
    expect(completion.completed).toBe(2);
    expect(completion.completionRate).toBe(67);
  });
});
