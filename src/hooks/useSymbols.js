/**
 * 심볼 사전 관련 훅
 */
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useSymbolStore from '../store/useSymbolStore';
import useAuthStore from '../store/useAuthStore';

const EMPTY_LIST = [];

/**
 * 심볼 훅
 * @returns {Object}
 */
export default function useSymbols() {
  const user = useAuthStore(useShallow(state => state.user));
  const userId = user?.id;

  const [searchQuery, setSearchQuery] = useState('');

  const {
    symbols: _symbols,
    isLoading,
    error,
  } = useSymbolStore(useShallow(state => ({
    symbols: state.symbols,
    isLoading: state.isLoading,
    error: state.error,
  })));

  const updateSymbolMeaning = useSymbolStore(state => state.updateSymbolMeaning);
  const deleteSymbol = useSymbolStore(state => state.deleteSymbol);
  const getSymbolById = useSymbolStore(state => state.getSymbolById);
  const getUserSymbols = useSymbolStore(state => state.getUserSymbols);
  const getTopSymbols = useSymbolStore(state => state.getTopSymbols);
  const getRecentSymbols = useSymbolStore(state => state.getRecentSymbols);
  const searchSymbols = useSymbolStore(state => state.searchSymbols);
  const getTotalSymbolCount = useSymbolStore(state => state.getTotalSymbolCount);

  /**
   * 사용자의 모든 심볼
   */
  const userSymbols = userId ? getUserSymbols(userId) : EMPTY_LIST;

  /**
   * 상위 심볼
   */
  const topSymbols = userId ? getTopSymbols(userId, 10) : EMPTY_LIST;

  /**
   * 최근 심볼
   */
  const recentSymbols = userId ? getRecentSymbols(userId, 10) : EMPTY_LIST;

  /**
   * 검색 결과
   */
  const searchResults = userId && searchQuery.trim()
    ? searchSymbols(userId, searchQuery)
    : EMPTY_LIST;

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
  const totalCount = userId ? getTotalSymbolCount(userId) : 0;

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
