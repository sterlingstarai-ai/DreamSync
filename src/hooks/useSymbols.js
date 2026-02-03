/**
 * 심볼 사전 관련 훅
 */
import { useCallback, useMemo, useState } from 'react';
import useSymbolStore from '../store/useSymbolStore';
import useAuthStore from '../store/useAuthStore';

/**
 * 심볼 훅
 * @returns {Object}
 */
export default function useSymbols() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const [searchQuery, setSearchQuery] = useState('');

  const {
    symbols,
    isLoading,
    error,
    updateSymbolMeaning,
    deleteSymbol,
    getSymbolById,
    getUserSymbols,
    getTopSymbols,
    getRecentSymbols,
    searchSymbols,
    getTotalSymbolCount,
  } = useSymbolStore();

  /**
   * 사용자의 모든 심볼
   */
  const userSymbols = useMemo(() => {
    if (!userId) return [];
    return getUserSymbols(userId);
  }, [userId, getUserSymbols, symbols]);

  /**
   * 상위 심볼
   */
  const topSymbols = useMemo(() => {
    if (!userId) return [];
    return getTopSymbols(userId, 10);
  }, [userId, getTopSymbols, symbols]);

  /**
   * 최근 심볼
   */
  const recentSymbols = useMemo(() => {
    if (!userId) return [];
    return getRecentSymbols(userId, 10);
  }, [userId, getRecentSymbols, symbols]);

  /**
   * 검색 결과
   */
  const searchResults = useMemo(() => {
    if (!userId || !searchQuery.trim()) return [];
    return searchSymbols(userId, searchQuery);
  }, [userId, searchQuery, searchSymbols, symbols]);

  /**
   * 표시할 심볼 목록 (검색 중이면 검색 결과, 아니면 전체)
   */
  const displaySymbols = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return userSymbols;
  }, [searchQuery, searchResults, userSymbols]);

  /**
   * 심볼 의미 수정
   */
  const editSymbolMeaning = useCallback((symbolId, meaning) => {
    updateSymbolMeaning(symbolId, meaning);
  }, [updateSymbolMeaning]);

  /**
   * 심볼 삭제
   */
  const removeSymbol = useCallback((symbolId) => {
    deleteSymbol(symbolId);
  }, [deleteSymbol]);

  /**
   * 심볼 상세 조회
   */
  const getSymbolDetail = useCallback((symbolId) => {
    return getSymbolById(symbolId);
  }, [getSymbolById]);

  /**
   * 검색어 설정
   */
  const search = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  /**
   * 검색 초기화
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  /**
   * 총 심볼 수
   */
  const totalCount = useMemo(() => {
    if (!userId) return 0;
    return getTotalSymbolCount(userId);
  }, [userId, getTotalSymbolCount, symbols]);

  /**
   * 통계
   */
  const stats = useMemo(() => {
    if (userSymbols.length === 0) {
      return {
        totalSymbols: 0,
        totalOccurrences: 0,
        avgOccurrence: 0,
        mostFrequent: null,
      };
    }

    const totalOccurrences = userSymbols.reduce((sum, s) => sum + s.count, 0);
    const avgOccurrence = Math.round((totalOccurrences / userSymbols.length) * 10) / 10;
    const mostFrequent = userSymbols[0] || null;

    return {
      totalSymbols: userSymbols.length,
      totalOccurrences,
      avgOccurrence,
      mostFrequent,
    };
  }, [userSymbols]);

  return {
    // 상태
    symbols: userSymbols,
    displaySymbols,
    topSymbols,
    recentSymbols,
    searchResults,
    searchQuery,
    totalCount,
    stats,
    isLoading,
    error,

    // 액션
    editSymbolMeaning,
    removeSymbol,
    getSymbolDetail,
    search,
    clearSearch,
  };
}
