/**
 * 수면 데이터 상태 관리 스토어
 *
 * WearableSleepSummary를 날짜별로 저장.
 * 소스 우선순위: 사용자 수동 수정 > 웨어러블 자동값
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/adapters/storage';
import { getTodayString } from '../lib/utils/date';

const useSleepStore = create(
  persist(
    (set, get) => ({
      /** @type {import('../lib/health/schemas').WearableSleepSummary[]} */
      summaries: [],

      /**
       * 수면 요약 저장/업데이트
       *
       * 동일 날짜에 이미 데이터가 있으면:
       * - 수동 수정(manual)은 항상 덮어쓰기
       * - 자동값(healthkit/healthconnect)은 기존 manual이 없을 때만 저장
       *
       * @param {import('../lib/health/schemas').WearableSleepSummary} summary
       */
      setSleepSummary: (summary) => {
        set((state) => {
          const existing = state.summaries.find(s => s.date === summary.date);

          if (existing) {
            // 사용자 수정이 우선: manual은 항상 우선, 자동값은 manual이 없을 때만
            if (summary.source === 'manual' || existing.source !== 'manual') {
              return {
                summaries: state.summaries.map(s =>
                  s.date === summary.date ? summary : s
                ),
              };
            }
            // 기존이 manual이고 새 데이터가 자동값이면 무시
            return state;
          }

          return {
            summaries: [summary, ...state.summaries].slice(0, 90), // 최대 90일
          };
        });
      },

      /**
       * 여러 수면 요약 일괄 저장 (동기화용)
       * @param {import('../lib/health/schemas').WearableSleepSummary[]} newSummaries
       */
      setSleepSummaries: (newSummaries) => {
        for (const summary of newSummaries) {
          get().setSleepSummary(summary);
        }
      },

      /**
       * 특정 날짜 수면 요약 조회
       * @param {string} date - YYYY-MM-DD
       * @returns {import('../lib/health/schemas').WearableSleepSummary | undefined}
       */
      getSummaryByDate: (date) => {
        return get().summaries.find(s => s.date === date);
      },

      /**
       * 오늘 수면 요약
       * @returns {import('../lib/health/schemas').WearableSleepSummary | undefined}
       */
      getTodaySummary: () => {
        return get().getSummaryByDate(getTodayString());
      },

      /**
       * 최근 N일 수면 요약
       * @param {number} days
       * @returns {import('../lib/health/schemas').WearableSleepSummary[]}
       */
      getRecentSummaries: (days = 7) => {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        return get().summaries
          .filter(s => s.date >= cutoffStr)
          .sort((a, b) => b.date.localeCompare(a.date));
      },

      /**
       * 최근 N일 수면 데이터 커버리지 (%)
       * @param {number} days
       * @returns {number} 0-100
       */
      getCoverage: (days = 7) => {
        const recent = get().getRecentSummaries(days);
        return Math.round((recent.length / days) * 100);
      },

      /**
       * 웨어러블 데이터 존재 여부 (최근 7일)
       * @returns {boolean}
       */
      hasWearableData: () => {
        return get().getRecentSummaries(7).some(
          s => s.source === 'healthkit' || s.source === 'healthconnect'
        );
      },

      /**
       * 스토어 초기화
       */
      reset: () => {
        set({ summaries: [] });
      },
    }),
    {
      name: 'sleep',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        summaries: state.summaries,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useSleepStore;
