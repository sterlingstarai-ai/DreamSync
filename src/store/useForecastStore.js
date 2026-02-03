/**
 * 예보 데이터 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { getTodayString } from '../lib/utils/date';
import { createForecast } from '../lib/ai/generateForecast';
import { zustandStorage } from '../lib/adapters/storage';

const useForecastStore = create(
  persist(
    (set, get) => ({
      // 상태
      forecasts: [],
      isLoading: false,
      isGenerating: false,
      error: null,

      // 액션
      /**
       * 새 예보 생성
       * @param {Object} params
       * @param {string} params.userId
       * @param {Array} params.recentDreams
       * @param {Array} params.recentLogs
       * @param {string} [params.date] - 예보 대상 날짜 (기본: 오늘)
       */
      generateForecast: async ({ userId, recentDreams, recentLogs, date }) => {
        const targetDate = date || getTodayString();

        // 이미 같은 날짜 예보가 있는지 확인
        const existing = get().getForecastByDate(userId, targetDate);
        if (existing) {
          return existing;
        }

        set({ isGenerating: true, error: null });

        const result = await createForecast({ recentDreams, recentLogs });

        if (result.success) {
          const forecast = {
            id: generateId(),
            userId,
            date: targetDate,
            prediction: result.data,
            actual: null,
            accuracy: null,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            forecasts: [forecast, ...state.forecasts],
            isGenerating: false,
          }));

          return forecast;
        } else {
          set({
            isGenerating: false,
            error: result.error,
          });
          return null;
        }
      },

      /**
       * 실제 결과 기록 및 정확도 계산
       * MVP: 컨디션 기반 정확도만 사용 (스키마 정합성 보장)
       * @param {string} forecastId
       * @param {Object} actual
       * @param {number} actual.condition - 실제 컨디션 (1-5)
       */
      recordActual: (forecastId, actual) => {
        const forecast = get().forecasts.find(f => f.id === forecastId);
        if (!forecast?.prediction) return;

        // 컨디션 기반 정확도 (1-5 스케일, 차이 1당 -25%)
        const conditionDiff = Math.abs(forecast.prediction.condition - actual.condition);
        const accuracy = Math.max(0, Math.round(100 - conditionDiff * 25));

        set((state) => ({
          forecasts: state.forecasts.map(f =>
            f.id === forecastId
              ? { ...f, actual, accuracy }
              : f
          ),
        }));
      },

      /**
       * 특정 예보 조회
       * @param {string} forecastId
       * @returns {Object|undefined}
       */
      getForecastById: (forecastId) => {
        return get().forecasts.find(f => f.id === forecastId);
      },

      /**
       * 특정 날짜 예보 조회
       * @param {string} userId
       * @param {string} date
       * @returns {Object|undefined}
       */
      getForecastByDate: (userId, date) => {
        return get().forecasts.find(f =>
          f.userId === userId && f.date === date
        );
      },

      /**
       * 오늘 예보 조회
       * @param {string} userId
       * @returns {Object|undefined}
       */
      getTodayForecast: (userId) => {
        return get().getForecastByDate(userId, getTodayString());
      },

      /**
       * 최근 예보 목록
       * @param {string} userId
       * @param {number} limit
       * @returns {Array}
       */
      getRecentForecasts: (userId, limit = 7) => {
        return get().forecasts
          .filter(f => f.userId === userId)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, limit);
      },

      /**
       * 정확도가 기록된 예보 목록
       * @param {string} userId
       * @returns {Array}
       */
      getVerifiedForecasts: (userId) => {
        return get().forecasts.filter(f =>
          f.userId === userId && f.accuracy !== null
        );
      },

      /**
       * 평균 예보 정확도
       * @param {string} userId
       * @returns {number}
       */
      getAverageAccuracy: (userId) => {
        const verified = get().getVerifiedForecasts(userId);
        if (verified.length === 0) return 0;

        const sum = verified.reduce((acc, f) => acc + f.accuracy, 0);
        return Math.round(sum / verified.length);
      },

      /**
       * 예보 삭제
       * @param {string} forecastId
       */
      deleteForecast: (forecastId) => {
        set((state) => ({
          forecasts: state.forecasts.filter(f => f.id !== forecastId),
        }));
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
          forecasts: [],
          isLoading: false,
          isGenerating: false,
          error: null,
        });
      },
    }),
    {
      name: 'forecasts',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        forecasts: state.forecasts,
      }),
    }
  )
);

export default useForecastStore;
