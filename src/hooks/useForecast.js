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
import { getDaysAgo } from '../lib/utils/date';

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
  const getForecastByDate = useForecastStore(state => state.getForecastByDate);
  const getRecentForecasts = useForecastStore(state => state.getRecentForecasts);
  const getAverageAccuracy = useForecastStore(state => state.getAverageAccuracy);
  const getExperimentSummary = useForecastStore(state => state.getExperimentSummary);
  const getReviewStats = useForecastStore(state => state.getReviewStats);
  const toggleActionSuggestion = useForecastStore(state => state.toggleActionSuggestion);
  const deleteForecast = useForecastStore(state => state.deleteForecast);
  const clearError = useForecastStore(state => state.clearError);

  const getRecentDreams = useDreamStore(state => state.getRecentDreams);
  const getRecentLogs = useCheckInStore(state => state.getRecentLogs);
  const getTodayLog = useCheckInStore(state => state.getTodayLog);
  const getLogByDate = useCheckInStore(state => state.getLogByDate);
  const sleepStore = useSleepStore();
  const yesterdayDate = getDaysAgo(1);

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
   * 어제 예보/체크인 (예보 검증 루프)
   */
  const yesterdayForecast = useMemo(() => {
    if (!userId) return null;
    return getForecastByDate(userId, yesterdayDate) || null;
  }, [userId, getForecastByDate, yesterdayDate, forecasts]);

  const yesterdayLog = useMemo(() => {
    if (!userId) return null;
    return getLogByDate(userId, yesterdayDate) || null;
  }, [userId, getLogByDate, yesterdayDate]);

  const canReviewYesterdayForecast = useMemo(() => {
    return Boolean(yesterdayForecast && !yesterdayForecast.actual && yesterdayLog);
  }, [yesterdayForecast, yesterdayLog]);

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
   * 행동 실험 통계
   */
  const experimentSummary = useMemo(() => {
    if (!userId) {
      return {
        sampleSize: 0,
        highCompletionDays: 0,
        lowCompletionDays: 0,
        avgConditionHighCompletion: 0,
        avgConditionLowCompletion: 0,
        improvement: 0,
      };
    }
    return getExperimentSummary(userId, 30);
  }, [userId, getExperimentSummary, forecasts]);

  /**
   * 예보 검증 통계
   */
  const reviewStats = useMemo(() => {
    if (!userId) {
      return {
        verifiedCount: 0,
        hitCount: 0,
        missCount: 0,
        partialCount: 0,
      };
    }
    return getReviewStats(userId, 30);
  }, [userId, getReviewStats, forecasts]);

  /**
   * 오늘 추천 행동 실천 진행도
   */
  const todayActionProgress = useMemo(() => {
    if (!todayForecast) return { total: 0, completed: 0, completionRate: 0 };
    const planned = todayForecast.experiment?.plannedSuggestions || todayForecast.prediction?.suggestions || [];
    const completed = todayForecast.experiment?.completedSuggestions || [];
    const completionRate = planned.length > 0
      ? Math.round((completed.length / planned.length) * 100)
      : 0;
    return {
      total: planned.length,
      completed: completed.length,
      completionRate,
    };
  }, [todayForecast]);

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
      outcome: 'partial',
      reasons: ['저녁 체크인 자동 기록'],
      recordedAt: new Date().toISOString(),
    });
  }, [userId, todayForecast, getTodayLog, recordActual]);

  /**
   * 예보 검증 기록
   */
  const reviewForecast = useCallback(({
    forecastId,
    condition,
    emotions = [],
    outcome = 'partial',
    reasons = [],
  }) => {
    if (!forecastId || typeof condition !== 'number') return false;
    recordActual(forecastId, {
      condition,
      emotions,
      outcome,
      reasons,
      recordedAt: new Date().toISOString(),
    });
    return true;
  }, [recordActual]);

  /**
   * 어제 예보 검증 (1탭 루프용)
   */
  const reviewYesterdayForecast = useCallback(({
    outcome = 'partial',
    reasons = [],
  } = {}) => {
    if (!canReviewYesterdayForecast || !yesterdayForecast || !yesterdayLog) {
      return false;
    }

    return reviewForecast({
      forecastId: yesterdayForecast.id,
      condition: yesterdayLog.condition,
      emotions: yesterdayLog.emotions || [],
      outcome,
      reasons,
    });
  }, [canReviewYesterdayForecast, yesterdayForecast, yesterdayLog, reviewForecast]);

  /**
   * 추천 행동 토글
   */
  const toggleSuggestionCompletion = useCallback((forecastId, suggestion) => {
    toggleActionSuggestion(forecastId, suggestion);
  }, [toggleActionSuggestion]);

  const toggleTodaySuggestion = useCallback((suggestion) => {
    if (!todayForecast) return;
    toggleActionSuggestion(todayForecast.id, suggestion);
  }, [todayForecast, toggleActionSuggestion]);

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
      review: reviewStats,
      experiments: experimentSummary,
    };
  }, [userForecasts, averageAccuracy, reviewStats, experimentSummary]);

  return {
    // 상태
    forecasts: userForecasts,
    todayForecast,
    yesterdayForecast,
    yesterdayLog,
    canReviewYesterdayForecast,
    recentForecasts,
    todayActionProgress,
    experimentSummary,
    reviewStats,
    stats,
    confidence,
    isLoading,
    isGenerating,
    error,

    // 액션
    createTodayForecast,
    recordActualFromCheckIn,
    reviewForecast,
    reviewYesterdayForecast,
    toggleSuggestionCompletion,
    toggleTodaySuggestion,
    removeForecast,
    clearError,
  };
}
