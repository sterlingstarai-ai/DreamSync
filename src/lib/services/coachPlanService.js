/**
 * Coach Plan Service
 *
 * 예보/패턴경보/목표 진행률을 합쳐
 * 오늘 실행할 코치 플랜(체크리스트)을 생성한다.
 */

const ALERT_TASK_MAP = {
  'compound-risk': {
    title: '오늘 핵심 할 일 1개만 정하고 나머지는 줄이기',
    priority: 4,
    estimatedMinutes: 10,
  },
  'stress-spike': {
    title: '오후에 10분 호흡 또는 스트레칭 루틴 실행하기',
    priority: 4,
    estimatedMinutes: 10,
  },
  'condition-drop': {
    title: '회복을 위해 오늘 일정 1개를 비우기',
    priority: 3,
    estimatedMinutes: 5,
  },
  'sleep-deficit': {
    title: '취침 시간을 평소보다 30분 앞당기기',
    priority: 4,
    estimatedMinutes: 0,
  },
  'nightmare-pattern': {
    title: '취침 전 5분 명상하고 자극 콘텐츠 줄이기',
    priority: 3,
    estimatedMinutes: 5,
  },
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqByTitle(tasks) {
  const used = new Set();
  return tasks.filter((task) => {
    const key = normalizeText(task.title);
    if (!key || used.has(key)) return false;
    used.add(key);
    return true;
  });
}

/**
 * 오늘 코치 플랜 생성
 * @param {Object} params
 * @param {Object|null} [params.forecast=null]
 * @param {Array} [params.alerts=[]]
 * @param {Object|null} [params.goalProgress=null]
 * @param {boolean} [params.checkedInToday=false]
 * @param {number} [params.todayDreamCount=0]
 */
export function buildCoachPlan({
  forecast = null,
  alerts = [],
  goalProgress = null,
  checkedInToday = false,
  todayDreamCount = 0,
} = {}) {
  const candidateTasks = [];

  // 1) 패턴 경보 기반 (우선순위 높음)
  alerts.slice(0, 3).forEach((alert) => {
    const mapped = ALERT_TASK_MAP[alert.id];
    if (mapped) {
      candidateTasks.push({
        title: mapped.title,
        source: 'alert',
        priority: mapped.priority,
        estimatedMinutes: mapped.estimatedMinutes,
      });
      return;
    }

    if (alert.recommendation) {
      candidateTasks.push({
        title: alert.recommendation,
        source: 'alert',
        priority: 3,
        estimatedMinutes: 10,
      });
    }
  });

  // 2) 오늘 예보 추천 행동
  const suggestions = Array.isArray(forecast?.suggestions)
    ? forecast.suggestions.filter(Boolean)
    : [];

  suggestions.slice(0, 3).forEach((suggestion) => {
    candidateTasks.push({
      title: String(suggestion),
      source: 'forecast',
      priority: 2,
      estimatedMinutes: 10,
    });
  });

  // 3) 주간 목표 기반 보정 행동
  const progress = goalProgress?.progress || {};
  if (progress.checkInDays && !progress.checkInDays.achieved && !checkedInToday) {
    candidateTasks.push({
      title: '오늘 저녁 체크인 완료하기',
      source: 'goal',
      priority: 3,
      estimatedMinutes: 3,
    });
  }

  if (progress.dreamCount && !progress.dreamCount.achieved && todayDreamCount === 0) {
    candidateTasks.push({
      title: '아침 기억이 남아있을 때 꿈 1개 기록하기',
      source: 'goal',
      priority: 2,
      estimatedMinutes: 5,
    });
  }

  if (progress.avgSleepHours && !progress.avgSleepHours.achieved) {
    candidateTasks.push({
      title: `오늘 수면 ${progress.avgSleepHours.target}시간 목표 지키기`,
      source: 'goal',
      priority: 3,
      estimatedMinutes: 0,
    });
  }

  const tasks = uniqByTitle(candidateTasks)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((task, index) => ({
      id: `coach-task-${index + 1}`,
      ...task,
      completed: false,
    }));

  return {
    tasks,
    recommendedFocus: tasks[0]?.source || 'none',
  };
}

/**
 * 코치 플랜 진행률 계산
 * @param {Array} tasks
 */
export function getCoachPlanCompletion(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export default {
  buildCoachPlan,
  getCoachPlanCompletion,
};
