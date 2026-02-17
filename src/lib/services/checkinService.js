/**
 * CheckIn Service
 *
 * Store 기반 체크인 접근/집계 서비스.
 */

import { getDaysAgo } from '../utils/date';
import useCheckInStore from '../../store/useCheckInStore';

/**
 * 체크인 저장
 * @param {Object} data
 * @param {string} data.userId
 */
export function saveCheckIn(data) {
  if (!data?.userId) {
    throw new Error('saveCheckIn requires userId');
  }

  return useCheckInStore.getState().addCheckIn(data);
}

/**
 * 오늘 체크인 여부
 * @param {string} userId
 */
export function hasCheckedInToday(userId) {
  if (!userId) return false;
  return useCheckInStore.getState().hasCheckedInToday(userId);
}

/**
 * 오늘 체크인 조회
 * @param {string} userId
 */
export function getTodayCheckIn(userId) {
  if (!userId) return null;
  return useCheckInStore.getState().getTodayLog(userId);
}

/**
 * 최근 N일 체크인
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getRecentCheckIns(userId, days = 7) {
  if (!userId) return [];
  return useCheckInStore.getState().getRecentLogs(userId, days);
}

/**
 * 연속 체크인 일수
 * @param {string} userId
 */
export function calculateStreak(userId) {
  if (!userId) return 0;
  return useCheckInStore.getState().getStreak(userId);
}

/**
 * 체크인 완료율
 * @param {string} userId
 * @param {number} [days=7]
 */
export function calculateCompletionRate(userId, days = 7) {
  if (!userId) return 0;
  const logs = getRecentCheckIns(userId, days);
  return Math.round((logs.length / days) * 100);
}

/**
 * 체크인 통계
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getCheckInStats(userId, days = 7) {
  if (!userId) {
    return {
      count: 0,
      avgCondition: 0,
      avgStress: 0,
      completionRate: 0,
      streak: 0,
    };
  }

  const store = useCheckInStore.getState();
  const logs = store.getRecentLogs(userId, days);

  if (logs.length === 0) {
    return {
      count: 0,
      avgCondition: 0,
      avgStress: 0,
      completionRate: 0,
      streak: store.getStreak(userId),
    };
  }

  const avgCondition = logs.reduce((sum, l) => sum + l.condition, 0) / logs.length;
  const avgStress = logs.reduce((sum, l) => sum + l.stressLevel, 0) / logs.length;

  return {
    count: logs.length,
    avgCondition: Math.round(avgCondition * 10) / 10,
    avgStress: Math.round(avgStress * 10) / 10,
    completionRate: calculateCompletionRate(userId, days),
    streak: store.getStreak(userId),
  };
}

/**
 * 컨디션 추이
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getConditionTrend(userId, days = 7) {
  if (!userId) return [];

  const logs = getRecentCheckIns(userId, days);
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const log = logs.find(c => c.date === date);
    trend.push({ date, value: log?.condition || 0 });
  }

  return trend;
}

/**
 * 스트레스 추이
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getStressTrend(userId, days = 7) {
  if (!userId) return [];

  const logs = getRecentCheckIns(userId, days);
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const log = logs.find(c => c.date === date);
    trend.push({ date, value: log?.stressLevel || 0 });
  }

  return trend;
}

/**
 * 데이터 내보내기
 * @param {string} [userId]
 */
export function exportCheckIns(userId) {
  const all = useCheckInStore.getState().logs;
  return {
    exportedAt: new Date().toISOString(),
    version: '1.1',
    checkIns: userId ? all.filter(l => l.userId === userId) : all,
  };
}

export default {
  saveCheckIn,
  hasCheckedInToday,
  getTodayCheckIn,
  getRecentCheckIns,
  calculateStreak,
  calculateCompletionRate,
  getCheckInStats,
  getConditionTrend,
  getStressTrend,
  exportCheckIns,
};
