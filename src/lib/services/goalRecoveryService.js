/**
 * Goal Recovery Service
 *
 * 주간 목표 진행률이 뒤처졌을 때 남은 기간 기준으로 복구 플랜을 생성한다.
 */

import { differenceInCalendarDays, endOfWeek } from 'date-fns';

const GOAL_META = {
  checkInDays: { label: '체크인', unit: '일' },
  dreamCount: { label: '꿈 기록', unit: '개' },
  avgSleepHours: { label: '평균 수면', unit: '시간' },
};

function clampPositiveNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function uniqByTitle(tasks = []) {
  const used = new Set();
  return tasks.filter((task) => {
    const key = String(task?.title || '').trim().toLowerCase();
    if (!key || used.has(key)) return false;
    used.add(key);
    return true;
  });
}

/**
 * 이번 주 남은 일수(오늘 포함)
 * @param {Date} [now=new Date()]
 */
export function getDaysLeftInWeek(now = new Date()) {
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return Math.max(1, differenceInCalendarDays(end, now) + 1);
}

function buildDeficits(progress = {}, daysLeftInWeek) {
  return Object.entries(progress)
    .map(([key, item]) => {
      const target = clampPositiveNumber(item?.target, 0);
      const current = clampPositiveNumber(item?.current, 0);
      const achieved = Boolean(item?.achieved);
      const rawGap = target - current;
      if (achieved || rawGap <= 0) return null;
      const meta = GOAL_META[key] || { label: key, unit: '' };

      return {
        key,
        label: meta.label,
        unit: meta.unit,
        current: key === 'avgSleepHours' ? roundOne(current) : Math.round(current),
        target: key === 'avgSleepHours' ? roundOne(target) : Math.round(target),
        gap: key === 'avgSleepHours' ? roundOne(rawGap) : Math.ceil(rawGap),
        requiredPerDay: key === 'avgSleepHours'
          ? roundOne(rawGap / daysLeftInWeek)
          : Math.ceil(rawGap / daysLeftInWeek),
      };
    })
    .filter(Boolean);
}

function buildRecoveryTasks(deficits, { checkedInToday = false, todayDreamCount = 0 } = {}) {
  const tasks = [];

  deficits.forEach((deficit) => {
    if (deficit.key === 'checkInDays') {
      tasks.push({
        title: checkedInToday
          ? `남은 ${deficit.gap}일 체크인을 위해 내일 알림 시간 예약하기`
          : '오늘 저녁 체크인 완료하기',
        source: 'recovery',
        priority: 4,
        estimatedMinutes: checkedInToday ? 2 : 3,
      });
    }

    if (deficit.key === 'dreamCount') {
      tasks.push({
        title: todayDreamCount > 0
          ? '오늘 기록한 꿈에 감정/심볼 1개씩 보강하기'
          : '아침 기억이 남아있을 때 꿈 1개 기록하기',
        source: 'recovery',
        priority: 3,
        estimatedMinutes: 5,
      });
    }

    if (deficit.key === 'avgSleepHours') {
      tasks.push({
        title: `이번 주 평균 ${deficit.target}시간을 위해 취침을 30분 앞당기기`,
        source: 'recovery',
        priority: 4,
        estimatedMinutes: 0,
      });
    }
  });

  return uniqByTitle(tasks)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((task, index) => ({
      id: `recovery-task-${index + 1}`,
      ...task,
      completed: false,
    }));
}

function getRiskLevel(deficits = []) {
  if (!deficits.length) return 'low';

  const hasHighRisk = deficits.some((deficit) => {
    if (deficit.key === 'avgSleepHours') return deficit.gap >= 1;
    return deficit.requiredPerDay > 1;
  });

  if (hasHighRisk) return 'high';
  if (deficits.length >= 2) return 'medium';
  return 'low';
}

/**
 * 주간 목표 복구 플랜 생성
 * @param {Object} params
 * @param {Object|null} [params.goalProgress=null]
 * @param {boolean} [params.checkedInToday=false]
 * @param {number} [params.todayDreamCount=0]
 * @param {number} [params.daysLeftInWeek]
 */
export function buildGoalRecoveryPlan({
  goalProgress = null,
  checkedInToday = false,
  todayDreamCount = 0,
  daysLeftInWeek = getDaysLeftInWeek(),
} = {}) {
  const safeDaysLeft = Math.max(1, Math.round(daysLeftInWeek));
  const deficits = buildDeficits(goalProgress?.progress || {}, safeDaysLeft);
  const riskLevel = getRiskLevel(deficits);

  if (!deficits.length) {
    return {
      isNeeded: false,
      riskLevel,
      daysLeftInWeek: safeDaysLeft,
      deficits: [],
      tasks: [],
      headline: '이번 주 목표 페이스가 안정적이에요.',
    };
  }

  const tasks = buildRecoveryTasks(deficits, {
    checkedInToday,
    todayDreamCount,
  });

  return {
    isNeeded: true,
    riskLevel,
    daysLeftInWeek: safeDaysLeft,
    deficits,
    tasks,
    headline: riskLevel === 'high'
      ? '이번 주 목표 달성 위험도가 높아요. 오늘 보정 액션이 필요해요.'
      : '이번 주 목표 달성을 위해 가벼운 보정 액션을 추천해요.',
  };
}

export default {
  getDaysLeftInWeek,
  buildGoalRecoveryPlan,
};
