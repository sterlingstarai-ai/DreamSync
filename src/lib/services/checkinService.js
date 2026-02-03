/**
 * CheckIn Service
 *
 * 체크인 저장, 조회, 통계를 담당하는 서비스 레이어
 */

import { generateId } from '../utils/id';
import { getTodayString, getDaysAgo } from '../utils/date';
import useCheckInStore from '../../store/useCheckInStore';

/**
 * 체크인 저장
 */
export function saveCheckIn(data) {
  const store = useCheckInStore.getState();
  const today = getTodayString();

  const checkIn = {
    id: generateId(),
    date: today,
    ...data,
    createdAt: new Date().toISOString(),
  };

  store.addLog(checkIn);
  return checkIn;
}

/**
 * 오늘 체크인 여부
 */
export function hasCheckedInToday() {
  const store = useCheckInStore.getState();
  const today = getTodayString();
  return store.logs.some(log => log.date === today);
}

/**
 * 오늘 체크인 조회
 */
export function getTodayCheckIn() {
  const store = useCheckInStore.getState();
  const today = getTodayString();
  return store.logs.find(log => log.date === today);
}

/**
 * 최근 N일 체크인 조회
 */
export function getRecentCheckIns(days = 7) {
  const store = useCheckInStore.getState();
  const cutoff = getDaysAgo(days);

  return store.logs.filter(log => log.date >= cutoff);
}

/**
 * 체크인 연속 기록 계산
 */
export function calculateStreak() {
  const store = useCheckInStore.getState();
  const sortedLogs = [...store.logs].sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) { // 최대 1년
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasLog = sortedLogs.some(log => log.date === dateStr);

    if (hasLog) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (i === 0) {
      // 오늘 체크인 안 했으면 어제부터 계산
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 체크인 완료율 계산 (최근 7일)
 */
export function calculateCompletionRate(days = 7) {
  const recentCheckIns = getRecentCheckIns(days);
  return Math.round((recentCheckIns.length / days) * 100);
}

/**
 * 체크인 통계
 */
export function getCheckInStats(days = 7) {
  const checkIns = getRecentCheckIns(days);

  if (checkIns.length === 0) {
    return {
      count: 0,
      avgCondition: 0,
      avgStress: 0,
      completionRate: 0,
      streak: calculateStreak(),
    };
  }

  // 평균 컨디션
  const conditions = checkIns.filter(c => c.condition).map(c => c.condition);
  const avgCondition = conditions.length > 0
    ? conditions.reduce((a, b) => a + b, 0) / conditions.length
    : 0;

  // 평균 스트레스
  const stresses = checkIns.filter(c => c.stressLevel).map(c => c.stressLevel);
  const avgStress = stresses.length > 0
    ? stresses.reduce((a, b) => a + b, 0) / stresses.length
    : 0;

  return {
    count: checkIns.length,
    avgCondition: Math.round(avgCondition * 10) / 10,
    avgStress: Math.round(avgStress * 10) / 10,
    completionRate: calculateCompletionRate(days),
    streak: calculateStreak(),
  };
}

/**
 * 컨디션 추이 데이터 (차트용)
 */
export function getConditionTrend(days = 7) {
  const checkIns = getRecentCheckIns(days);
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const checkIn = checkIns.find(c => c.date === date);

    trend.push({
      date,
      value: checkIn?.condition || 0,
    });
  }

  return trend;
}

/**
 * 스트레스 추이 데이터 (차트용)
 */
export function getStressTrend(days = 7) {
  const checkIns = getRecentCheckIns(days);
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const checkIn = checkIns.find(c => c.date === date);

    trend.push({
      date,
      value: checkIn?.stressLevel || 0,
    });
  }

  return trend;
}

/**
 * 데이터 내보내기 (JSON)
 */
export function exportCheckIns() {
  const store = useCheckInStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    checkIns: store.logs,
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
