/**
 * 예보 관련 훅
 */
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useForecastStore from '../store/useForecastStore';
import useDreamStore from '../store/useDreamStore';
import useCheckInStore from '../store/useCheckInStore';
import useAuthStore from '../store/useAuthStore';
import useSleepStore from '../store/useSleepStore';
import { calculateConfidence } from '../lib/scoring/confidence';

/**
 * 예보 훅
 * @returns {Object}
 */
export default function useForecast() {
  const user = useAuthStore(useShallow(state => state.user));
  const userId = user?.id;

  const {
    forecasts,
    isLoading,
    isGenerating,
    error,
  } = useForecastStore(useShallow(state => ({
    forecasts: state.forecasts,
    isLoading: state.isLoading,
    isGenerating: state.isGenerating,
    error: state.error,
  })));

  const generateForecast = useForecastStore(state => state.generateForecast);
  const recordActual = useForecastStore(state => state.recordActual);
  const getTodayForecast = useForecastStore(state => state.getTodayForecast);
  const getRecentForecasts = useForecastStore(state => state.getRecentForecasts);
  const getAverageAccuracy = useForecastStore(state => state.getAverageAccuracy);
  const deleteForecast = useForecastStore(state => state.deleteForecast);
  const clearError = useForecastStore(state => state.clearError);

  const getRecentDreams = useDreamStore(state => state.getRecentDreams);
  const getRecentLogs = useCheckInStore(state => state.getRecentLogs);
  const getTodayLog = useCheckInStore(state => state.getTodayLog);
  const sleepStore = useSleepStore();

  /**
   * 사용자의 모든 예보
   */
  const userForecasts = useMemo(() => {
    if (!userId) return [];
    return forecasts.filter(f => f.userId === userId);
  }, [forecasts, userId]);

  /**
   * 오늘 예보
   */
  const todayForecast = useMemo(() => {
    if (!userId) return null;
    return getTodayForecast(userId);
  }, [userId, getTodayForecast, forecasts]);

  /**
   * 최근 예보 목록
   */
  const recentForecasts = useMemo(() => {
    if (!userId) return [];
    return getRecentForecasts(userId, 7);
  }, [userId, getRecentForecasts, forecasts]);

  /**
   * 평균 정확도
   */
  const averageAccuracy = useMemo(() => {
    if (!userId) return 0;
    return getAverageAccuracy(userId);
  }, [userId, getAverageAccuracy, forecasts]);

  /**
   * 실시간 Confidence 점수 (웨어러블 데이터 포함)
   */
  const confidence = useMemo(() => {
    if (!userId) return 0;
    const recentDreams = getRecentDreams(userId, 7);
    const recentLogs = getRecentLogs(userId, 7);
    const hasWearable = sleepStore.hasWearableData();
    const todaySleep = sleepStore.getTodaySummary();

    return calculateConfidence({
      data: {
        dreamCount: recentDreams.length,
        checkInCount: recentLogs.length,
        hasWearableData: hasWearable,
      },
      sleep: {
        sleepDuration: todaySleep?.totalSleepMinutes ?? undefined,
        remPercent: todaySleep?.remMinutes != null && todaySleep?.totalSleepMinutes
          ? (todaySleep.remMinutes / todaySleep.totalSleepMinutes) * 100
          : undefined,
        deepPercent: todaySleep?.deepMinutes != null && todaySleep?.totalSleepMinutes
          ? (todaySleep.deepMinutes / todaySleep.totalSleepMinutes) * 100
          : undefined,
        hrv: todaySleep?.hrvMs ?? undefined,
        isManualInput: !hasWearable,
      },
      consistency: {
        accuracyHistory: userForecasts
          .filter(f => f.accuracy !== null)
          .map(f => f.accuracy),
      },
      model: {},
    });
  }, [userId, getRecentDreams, getRecentLogs, sleepStore, userForecasts]);

  /**
   * 오늘 예보 생성
   */
  const createTodayForecast = useCallback(async () => {
    if (!userId) return null;

    // 이미 오늘 예보가 있으면 반환
    const existing = getTodayForecast(userId);
    if (existing) return existing;

    // 최근 데이터 수집
    const recentDreams = getRecentDreams(userId, 7);
    const recentLogs = getRecentLogs(userId, 7);

    return await generateForecast({
      userId,
      recentDreams,
      recentLogs,
    });
  }, [userId, getTodayForecast, getRecentDreams, getRecentLogs, generateForecast]);

  /**
   * 체크인 기반 실제 결과 기록
   */
  const recordActualFromCheckIn = useCallback(() => {
    if (!userId || !todayForecast) return;

    const todayLog = getTodayLog(userId);
    if (!todayLog) return;

    // 이미 실제 결과가 기록되어 있으면 스킵
    if (todayForecast.actual) return;

    recordActual(todayForecast.id, {
      condition: todayLog.condition,
      emotions: todayLog.emotions,
    });
  }, [userId, todayForecast, getTodayLog, recordActual]);

  /**
   * 예보 삭제
   */
  const removeForecast = useCallback((forecastId) => {
    deleteForecast(forecastId);
  }, [deleteForecast]);

  /**
   * 통계
   */
  const stats = useMemo(() => {
    const verified = userForecasts.filter(f => f.accuracy !== null);
    return {
      totalForecasts: userForecasts.length,
      verifiedCount: verified.length,
      averageAccuracy,
    };
  }, [userForecasts, averageAccuracy]);

  return {
    // 상태
    forecasts: userForecasts,
    todayForecast,
    recentForecasts,
    stats,
    confidence,
    isLoading,
    isGenerating,
    error,

    // 액션
    createTodayForecast,
    recordActualFromCheckIn,
    removeForecast,
    clearError,
  };
}
