/**
 * 꿈 데이터 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { getTodayString, toDateString } from '../lib/utils/date';
import { analyzeDream } from '../lib/ai/analyzeDream';
import { zustandStorage } from '../lib/adapters/storage';
import logger from '../lib/utils/logger';
import useSymbolStore from './useSymbolStore';

const MAX_DREAMS = 500;

const useDreamStore = create(
  persist(
    (set, get) => ({
      // 상태
      dreams: [],
      isLoading: false,
      isAnalyzing: false,
      error: null,

      // 액션
      /**
       * 새 꿈 기록 추가
       * @param {Object} params
       * @param {string} params.content - 꿈 내용
       * @param {string} [params.voiceUrl] - 음성 녹음 URL
       * @param {string} params.userId - 사용자 ID
       * @param {boolean} [params.autoAnalyze=true] - 자동 분석 여부
       */
      addDream: async ({ content, voiceUrl, userId, autoAnalyze = true }) => {
        set({ isLoading: true, error: null });

        const now = new Date().toISOString();
        const dream = {
          id: generateId(),
          userId,
          content,
          voiceUrl: voiceUrl || null,
          analysis: null,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          dreams: [dream, ...state.dreams].slice(0, MAX_DREAMS),
          isLoading: false,
        }));

        // 자동 분석
        if (autoAnalyze) {
          get().analyzeDream(dream.id);
        }

        return dream;
      },

      /**
       * 꿈 분석 실행
       * @param {string} dreamId
       */
      analyzeDream: async (dreamId) => {
        const { dreams } = get();
        const dream = dreams.find(d => d.id === dreamId);

        if (!dream) {
          logger.error('Dream not found:', dreamId);
          return;
        }

        set({ isAnalyzing: true });

        const result = await analyzeDream(dream.content);

        if (result.success) {
          set((state) => ({
            dreams: state.dreams.map(d =>
              d.id === dreamId
                ? { ...d, analysis: result.data, updatedAt: new Date().toISOString() }
                : d
            ),
            isAnalyzing: false,
          }));
        } else {
          set({
            isAnalyzing: false,
            error: result.error,
          });
        }
      },

      /**
       * 꿈 내용 수정
       * @param {string} dreamId
       * @param {string} content
       */
      updateDreamContent: (dreamId, content) => {
        set((state) => ({
          dreams: state.dreams.map(d =>
            d.id === dreamId
              ? { ...d, content, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      /**
       * 꿈 삭제 (심볼 cascading delete 포함)
       * @param {string} dreamId
       */
      deleteDream: (dreamId) => {
        const dream = get().dreams.find(d => d.id === dreamId);

        set((state) => ({
          dreams: state.dreams.filter(d => d.id !== dreamId),
        }));

        // 심볼 사전에서 해당 dreamId 제거
        if (dream?.analysis?.symbols) {
          const symbolStore = useSymbolStore.getState();
          const { symbols } = symbolStore;

          for (const sym of dream.analysis.symbols) {
            const stored = symbols.find(
              s => s.userId === dream.userId && s.name === sym.name
            );
            if (!stored) continue;

            const updatedDreamIds = stored.dreamIds.filter(id => id !== dreamId);
            if (updatedDreamIds.length === 0) {
              symbolStore.deleteSymbol(stored.id);
            } else {
              useSymbolStore.setState((state) => ({
                symbols: state.symbols.map(s =>
                  s.id === stored.id
                    ? { ...s, dreamIds: updatedDreamIds, count: updatedDreamIds.length }
                    : s
                ),
              }));
            }
          }
        }
      },

      /**
       * 특정 꿈 조회
       * @param {string} dreamId
       * @returns {Object|undefined}
       */
      getDreamById: (dreamId) => {
        return get().dreams.find(d => d.id === dreamId);
      },

      /**
       * 사용자의 모든 꿈 조회
       * @param {string} userId
       * @returns {Array}
       */
      getDreamsByUser: (userId) => {
        return get().dreams.filter(d => d.userId === userId);
      },

      /**
       * 최근 N일간의 꿈 조회
       * @param {string} userId
       * @param {number} days
       * @returns {Array}
       */
      getRecentDreams: (userId, days = 7) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return get().dreams.filter(d =>
          d.userId === userId &&
          new Date(d.createdAt) >= cutoffDate
        );
      },

      /**
       * 오늘의 꿈 조회
       * @param {string} userId
       * @returns {Array}
       */
      getTodayDreams: (userId) => {
        const today = getTodayString();
        return get().dreams.filter(d =>
          d.userId === userId &&
          toDateString(new Date(d.createdAt)) === today
        );
      },

      /**
       * 특정 날짜의 꿈 조회
       * @param {string} userId
       * @param {string} date - YYYY-MM-DD
       * @returns {Array}
       */
      getDreamsByDate: (userId, date) => {
        return get().dreams.filter(d =>
          d.userId === userId &&
          toDateString(new Date(d.createdAt)) === date
        );
      },

      /**
       * 모든 심볼 추출 (사용자별)
       * @param {string} userId
       * @returns {Array}
       */
      getAllSymbols: (userId) => {
        const dreams = get().dreams.filter(d => d.userId === userId && d.analysis);
        const symbolMap = new Map();

        for (const dream of dreams) {
          if (dream.analysis?.symbols) {
            for (const symbol of dream.analysis.symbols) {
              const existing = symbolMap.get(symbol.name);
              if (existing) {
                existing.count++;
                existing.dreamIds.push(dream.id);
              } else {
                symbolMap.set(symbol.name, {
                  name: symbol.name,
                  meaning: symbol.meaning,
                  count: 1,
                  dreamIds: [dream.id],
                });
              }
            }
          }
        }

        return Array.from(symbolMap.values())
          .sort((a, b) => b.count - a.count);
      },

      /**
       * 에러 초기화
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 상태 초기화 (개발용)
       */
      reset: () => {
        set({
          dreams: [],
          isLoading: false,
          isAnalyzing: false,
          error: null,
        });
      },
    }),
    {
      name: 'dreams',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dreams: state.dreams,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useDreamStore;
