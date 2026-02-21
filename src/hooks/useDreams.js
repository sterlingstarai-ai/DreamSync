/**
 * 꿈 데이터 관련 훅
 */
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useDreamStore from '../store/useDreamStore';
import useAuthStore from '../store/useAuthStore';

const EMPTY_LIST = [];

/**
 * 꿈 데이터 훅
 * @returns {Object}
 */
export default function useDreams() {
  const user = useAuthStore(useShallow(state => state.user));
  const userId = user?.id;

  const {
    dreams,
    isLoading,
    isAnalyzing,
    error,
  } = useDreamStore(useShallow(state => ({
    dreams: state.dreams,
    isLoading: state.isLoading,
    isAnalyzing: state.isAnalyzing,
    error: state.error,
  })));

  const addDream = useDreamStore(state => state.addDream);
  const analyzeDream = useDreamStore(state => state.analyzeDream);
  const updateDreamContent = useDreamStore(state => state.updateDreamContent);
  const deleteDream = useDreamStore(state => state.deleteDream);
  const getDreamById = useDreamStore(state => state.getDreamById);
  const getTodayDreams = useDreamStore(state => state.getTodayDreams);
  const getRecentDreams = useDreamStore(state => state.getRecentDreams);
  const getDreamsByDate = useDreamStore(state => state.getDreamsByDate);
  const getAllSymbols = useDreamStore(state => state.getAllSymbols);
  const clearError = useDreamStore(state => state.clearError);

  /**
   * 사용자의 모든 꿈
   */
  const userDreams = useMemo(() => {
    if (!userId) return [];
    return dreams.filter(d => d.userId === userId);
  }, [dreams, userId]);

  /**
   * 오늘의 꿈
   */
  const todayDreams = userId ? getTodayDreams(userId) : EMPTY_LIST;

  /**
   * 최근 7일 꿈
   */
  const recentDreams = userId ? getRecentDreams(userId, 7) : EMPTY_LIST;

  /**
   * 새 꿈 기록
   */
  const createDream = useCallback(async (content, voiceUrl = null) => {
    if (!userId) return null;

    const dream = await addDream({
      content,
      voiceUrl,
      userId,
      autoAnalyze: true,
    });

    return dream;
  }, [userId, addDream]);

  /**
   * 꿈 분석 후 심볼 동기화
   */
  const analyzeAndSyncSymbols = useCallback(async (dreamId) => {
    await analyzeDream(dreamId);
  }, [analyzeDream]);

  /**
   * 꿈 삭제
   */
  const removeDream = useCallback((dreamId) => {
    deleteDream(dreamId);
  }, [deleteDream]);

  /**
   * 특정 날짜의 꿈 조회
   */
  const getDreamsForDate = useCallback((date) => {
    if (!userId) return [];
    return getDreamsByDate(userId, date);
  }, [userId, getDreamsByDate]);

  /**
   * 모든 심볼 가져오기
   */
  const symbols = userId ? getAllSymbols(userId) : EMPTY_LIST;

  /**
   * 통계
   */
  const stats = useMemo(() => {
    return {
      totalDreams: userDreams.length,
      todayCount: todayDreams.length,
      weekCount: recentDreams.length,
      uniqueSymbols: symbols.length,
    };
  }, [userDreams, todayDreams, recentDreams, symbols]);

  return {
    // 상태
    dreams: userDreams,
    todayDreams,
    recentDreams,
    symbols,
    stats,
    isLoading,
    isAnalyzing,
    error,

    // 액션
    createDream,
    updateDreamContent,
    analyzeAndSyncSymbols,
    removeDream,
    getDreamsForDate,
    getDreamById,
    clearError,
  };
}
