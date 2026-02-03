/**
 * 체크인 관련 훅
 */
import { useCallback, useMemo } from 'react';
import useCheckInStore from '../store/useCheckInStore';
import useAuthStore from '../store/useAuthStore';

/**
 * 체크인 훅
 * @returns {Object}
 */
export default function useCheckIn() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const {
    logs,
    isLoading,
    error,
    addCheckIn,
    updateCheckIn,
    deleteCheckIn,
    getTodayLog,
    hasCheckedInToday,
    getRecentLogs,
    getStreak,
    getAverageCondition,
    getWeeklyCompletionRate,
    getTopEmotions,
    clearError,
  } = useCheckInStore();

  /**
   * 사용자의 모든 체크인
   */
  const userLogs = useMemo(() => {
    if (!userId) return [];
    return logs.filter(log => log.userId === userId);
  }, [logs, userId]);

  /**
   * 오늘 체크인
   */
  const todayLog = useMemo(() => {
    if (!userId) return null;
    return getTodayLog(userId);
  }, [userId, getTodayLog, logs]);

  /**
   * 오늘 체크인 여부
   */
  const checkedInToday = useMemo(() => {
    if (!userId) return false;
    return hasCheckedInToday(userId);
  }, [userId, hasCheckedInToday, logs]);

  /**
   * 최근 7일 체크인
   */
  const recentLogs = useMemo(() => {
    if (!userId) return [];
    return getRecentLogs(userId, 7);
  }, [userId, getRecentLogs, logs]);

  /**
   * 연속 체크인 일수
   */
  const streak = useMemo(() => {
    if (!userId) return 0;
    return getStreak(userId);
  }, [userId, getStreak, logs]);

  /**
   * 평균 컨디션
   */
  const averageCondition = useMemo(() => {
    if (!userId) return 0;
    return getAverageCondition(userId, 7);
  }, [userId, getAverageCondition, logs]);

  /**
   * 주간 완료율
   */
  const completionRate = useMemo(() => {
    if (!userId) return 0;
    return getWeeklyCompletionRate(userId);
  }, [userId, getWeeklyCompletionRate, logs]);

  /**
   * 상위 감정
   */
  const topEmotions = useMemo(() => {
    if (!userId) return [];
    return getTopEmotions(userId, 7);
  }, [userId, getTopEmotions, logs]);

  /**
   * 새 체크인 추가
   */
  const submitCheckIn = useCallback(async ({
    condition,
    emotions,
    stressLevel,
    events,
    note,
    sleep,
  }) => {
    if (!userId) return null;

    return await addCheckIn({
      userId,
      condition,
      emotions,
      stressLevel,
      events,
      note,
      sleep,
    });
  }, [userId, addCheckIn]);

  /**
   * 체크인 업데이트
   */
  const editCheckIn = useCallback((logId, updates) => {
    return updateCheckIn(logId, updates);
  }, [updateCheckIn]);

  /**
   * 체크인 삭제
   */
  const removeCheckIn = useCallback((logId) => {
    deleteCheckIn(logId);
  }, [deleteCheckIn]);

  /**
   * 통계
   */
  const stats = useMemo(() => {
    return {
      totalCheckIns: userLogs.length,
      streak,
      averageCondition,
      completionRate,
      topEmotions,
    };
  }, [userLogs, streak, averageCondition, completionRate, topEmotions]);

  return {
    // 상태
    logs: userLogs,
    todayLog,
    checkedInToday,
    recentLogs,
    stats,
    isLoading,
    error,

    // 액션
    submitCheckIn,
    editCheckIn,
    removeCheckIn,
    clearError,
  };
}
