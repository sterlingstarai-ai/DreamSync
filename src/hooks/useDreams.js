/**
 * 꿈 데이터 관련 훅
 */
import { useCallback, useMemo } from 'react';
import useDreamStore from '../store/useDreamStore';
import useSymbolStore from '../store/useSymbolStore';
import useAuthStore from '../store/useAuthStore';

/**
 * 꿈 데이터 훅
 * @returns {Object}
 */
export default function useDreams() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const {
    dreams,
    isLoading,
    isAnalyzing,
    error,
    addDream,
    analyzeDream,
    updateDreamContent,
    deleteDream,
    getDreamById,
    getTodayDreams,
    getRecentDreams,
    getDreamsByDate,
    getAllSymbols,
    clearError,
  } = useDreamStore();

  const { syncSymbolsFromAnalysis } = useSymbolStore();

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
  const todayDreams = useMemo(() => {
    if (!userId) return [];
    return getTodayDreams(userId);
  }, [userId, getTodayDreams, dreams]);

  /**
   * 최근 7일 꿈
   */
  const recentDreams = useMemo(() => {
    if (!userId) return [];
    return getRecentDreams(userId, 7);
  }, [userId, getRecentDreams, dreams]);

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

    const dream = getDreamById(dreamId);
    if (dream?.analysis?.symbols && userId) {
      syncSymbolsFromAnalysis(userId, dreamId, dream.analysis.symbols);
    }
  }, [analyzeDream, getDreamById, syncSymbolsFromAnalysis, userId]);

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
  const symbols = useMemo(() => {
    if (!userId) return [];
    return getAllSymbols(userId);
  }, [userId, getAllSymbols, dreams]);

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
