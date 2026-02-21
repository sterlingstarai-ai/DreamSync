/**
 * 체크인 관련 훅
 */
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useCheckInStore from '../store/useCheckInStore';
import useAuthStore from '../store/useAuthStore';

const EMPTY_LIST = [];

/**
 * 체크인 훅
 * @returns {Object}
 */
export default function useCheckIn() {
  const user = useAuthStore(useShallow(state => state.user));
  const userId = user?.id;

  const {
    logs,
    isLoading,
    error,
  } = useCheckInStore(useShallow(state => ({
    logs: state.logs,
    isLoading: state.isLoading,
    error: state.error,
  })));

  const addCheckIn = useCheckInStore(state => state.addCheckIn);
  const updateCheckIn = useCheckInStore(state => state.updateCheckIn);
  const deleteCheckIn = useCheckInStore(state => state.deleteCheckIn);
  const getTodayLog = useCheckInStore(state => state.getTodayLog);
  const hasCheckedInToday = useCheckInStore(state => state.hasCheckedInToday);
  const getRecentLogs = useCheckInStore(state => state.getRecentLogs);
  const getStreak = useCheckInStore(state => state.getStreak);
  const getAverageCondition = useCheckInStore(state => state.getAverageCondition);
  const getWeeklyCompletionRate = useCheckInStore(state => state.getWeeklyCompletionRate);
  const getTopEmotions = useCheckInStore(state => state.getTopEmotions);
  const clearError = useCheckInStore(state => state.clearError);

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
  const todayLog = userId ? getTodayLog(userId) : null;

  /**
   * 오늘 체크인 여부
   */
  const checkedInToday = userId ? hasCheckedInToday(userId) : false;

  /**
   * 최근 7일 체크인
   */
  const recentLogs = userId ? getRecentLogs(userId, 7) : EMPTY_LIST;

  /**
   * 연속 체크인 일수
   */
  const streak = userId ? getStreak(userId) : 0;

  /**
   * 평균 컨디션
   */
  const averageCondition = userId ? getAverageCondition(userId, 7) : 0;

  /**
   * 주간 완료율
   */
  const completionRate = userId ? getWeeklyCompletionRate(userId) : 0;

  /**
   * 상위 감정
   */
  const topEmotions = userId ? getTopEmotions(userId, 7) : EMPTY_LIST;

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
    durationSec,
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
      durationSec,
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
