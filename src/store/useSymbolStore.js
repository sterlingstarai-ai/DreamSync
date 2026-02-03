/**
 * 개인 심볼 사전 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { getTodayString } from '../lib/utils/date';
import { zustandStorage } from '../lib/adapters/storage';

const useSymbolStore = create(
  persist(
    (set, get) => ({
      // 상태
      symbols: [],
      isLoading: false,
      error: null,

      // 액션
      /**
       * 새 심볼 추가 또는 기존 심볼 업데이트
       * @param {Object} params
       * @param {string} params.userId
       * @param {string} params.name
       * @param {string} params.meaning
       * @param {string} params.dreamId
       */
      addOrUpdateSymbol: ({ userId, name, meaning, dreamId }) => {
        const existing = get().getSymbolByName(userId, name);
        const today = getTodayString();

        if (existing) {
          // 기존 심볼 업데이트
          set((state) => ({
            symbols: state.symbols.map(s =>
              s.id === existing.id
                ? {
                    ...s,
                    count: s.count + 1,
                    dreamIds: [...new Set([...s.dreamIds, dreamId])],
                    lastSeen: today,
                    updatedAt: new Date().toISOString(),
                  }
                : s
            ),
          }));
        } else {
          // 새 심볼 추가
          const symbol = {
            id: generateId(),
            userId,
            name,
            meaning,
            count: 1,
            dreamIds: [dreamId],
            firstSeen: today,
            lastSeen: today,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => ({
            symbols: [...state.symbols, symbol],
          }));
        }
      },

      /**
       * 심볼 의미 수정 (개인화)
       * @param {string} symbolId
       * @param {string} meaning
       */
      updateSymbolMeaning: (symbolId, meaning) => {
        set((state) => ({
          symbols: state.symbols.map(s =>
            s.id === symbolId
              ? { ...s, meaning, updatedAt: new Date().toISOString() }
              : s
          ),
        }));
      },

      /**
       * 심볼 삭제
       * @param {string} symbolId
       */
      deleteSymbol: (symbolId) => {
        set((state) => ({
          symbols: state.symbols.filter(s => s.id !== symbolId),
        }));
      },

      /**
       * 특정 심볼 조회 (ID)
       * @param {string} symbolId
       * @returns {Object|undefined}
       */
      getSymbolById: (symbolId) => {
        return get().symbols.find(s => s.id === symbolId);
      },

      /**
       * 특정 심볼 조회 (이름)
       * @param {string} userId
       * @param {string} name
       * @returns {Object|undefined}
       */
      getSymbolByName: (userId, name) => {
        return get().symbols.find(s =>
          s.userId === userId && s.name === name
        );
      },

      /**
       * 사용자의 모든 심볼
       * @param {string} userId
       * @returns {Array}
       */
      getUserSymbols: (userId) => {
        return get().symbols
          .filter(s => s.userId === userId)
          .sort((a, b) => b.count - a.count);
      },

      /**
       * 자주 등장하는 심볼 (Top N)
       * @param {string} userId
       * @param {number} limit
       * @returns {Array}
       */
      getTopSymbols: (userId, limit = 10) => {
        return get().getUserSymbols(userId).slice(0, limit);
      },

      /**
       * 최근 등장한 심볼
       * @param {string} userId
       * @param {number} limit
       * @returns {Array}
       */
      getRecentSymbols: (userId, limit = 10) => {
        return get().symbols
          .filter(s => s.userId === userId)
          .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
          .slice(0, limit);
      },

      /**
       * 심볼 검색
       * @param {string} userId
       * @param {string} query
       * @returns {Array}
       */
      searchSymbols: (userId, query) => {
        const lowerQuery = query.toLowerCase();
        return get().symbols.filter(s =>
          s.userId === userId &&
          (s.name.toLowerCase().includes(lowerQuery) ||
           s.meaning.toLowerCase().includes(lowerQuery))
        );
      },

      /**
       * 꿈 분석 결과에서 심볼 동기화
       * @param {string} userId
       * @param {string} dreamId
       * @param {Array} symbols - 분석된 심볼 배열
       */
      syncSymbolsFromAnalysis: (userId, dreamId, symbols) => {
        const { addOrUpdateSymbol } = get();

        for (const symbol of symbols) {
          addOrUpdateSymbol({
            userId,
            name: symbol.name,
            meaning: symbol.personalMeaning || symbol.meaning,
            dreamId,
          });
        }
      },

      /**
       * 총 심볼 수
       * @param {string} userId
       * @returns {number}
       */
      getTotalSymbolCount: (userId) => {
        return get().symbols.filter(s => s.userId === userId).length;
      },

      /**
       * 상태 초기화 (개발용)
       */
      reset: () => {
        set({
          symbols: [],
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'symbols',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        symbols: state.symbols,
      }),
    }
  )
);

export default useSymbolStore;
