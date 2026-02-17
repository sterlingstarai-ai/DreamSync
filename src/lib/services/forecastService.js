/**
 * Forecast Service
 *
 * Store 기반 예보 생성/조회/집계 서비스.
 */

import useForecastStore from '../../store/useForecastStore';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';

/**
 * 오늘 예보 생성
 * @param {string} userId
 */
export async function generateTodayForecast(userId) {
  if (!userId) {
    throw new Error('generateTodayForecast requires userId');
  }

  const forecastStore = useForecastStore.getState();
  const existing = forecastStore.getTodayForecast(userId);
  if (existing) return existing;

  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();

  const recentDreams = dreamStore.getRecentDreams(userId, 7);
  const recentLogs = checkInStore.getRecentLogs(userId, 7);

  return forecastStore.generateForecast({
    userId,
    recentDreams,
    recentLogs,
  });
}

/**
 * 실제 결과 기록
 * @param {string} userId
 * @param {number} actualCondition
 */
export function recordActual(userId, actualCondition) {
  if (!userId) return;

  const forecastStore = useForecastStore.getState();
  const todayForecast = forecastStore.getTodayForecast(userId);
  if (!todayForecast) return;

  forecastStore.recordActual(todayForecast.id, { condition: actualCondition });
}

/**
 * 오늘 예보 조회
 * @param {string} userId
 */
export function getTodayForecast(userId) {
  if (!userId) return null;
  return useForecastStore.getState().getTodayForecast(userId);
}

/**
 * 예보 정확도 통계
 * @param {string} userId
 * @param {number} [days=14]
 */
export function getForecastStats(userId, days = 14) {
  if (!userId) {
    return {
      count: 0,
      avgAccuracy: 0,
      trend: 'stable',
    };
  }

  const store = useForecastStore.getState();
  const recent = store.getRecentForecasts(userId, days);
  const verified = recent.filter(f => f.accuracy !== null);

  if (verified.length === 0) {
    return {
      count: 0,
      avgAccuracy: 0,
      trend: 'stable',
    };
  }

  const avgAccuracy = Math.round(
    verified.reduce((sum, f) => sum + f.accuracy, 0) / verified.length,
  );

  const recentHalf = verified.slice(0, Math.ceil(days / 2));
  const olderHalf = verified.slice(Math.ceil(days / 2));

  let trend = 'stable';
  if (recentHalf.length > 0 && olderHalf.length > 0) {
    const recentAvg = recentHalf.reduce((s, f) => s + f.accuracy, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, f) => s + f.accuracy, 0) / olderHalf.length;

    if (recentAvg > olderAvg + 5) trend = 'up';
    else if (recentAvg < olderAvg - 5) trend = 'down';
  }

  return {
    count: verified.length,
    avgAccuracy,
    trend,
  };
}

/**
 * 데이터 내보내기
 * @param {string} [userId]
 */
export function exportForecasts(userId) {
  const all = useForecastStore.getState().forecasts;

  return {
    exportedAt: new Date().toISOString(),
    version: '1.1',
    forecasts: userId ? all.filter(f => f.userId === userId) : all,
  };
}

export default {
  generateTodayForecast,
  recordActual,
  getTodayForecast,
  getForecastStats,
  exportForecasts,
};
