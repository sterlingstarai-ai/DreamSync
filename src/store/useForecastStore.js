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
import analytics from '../lib/adapters/analytics';
import { createSyncMetadata } from '../lib/sync/metadata';
import { queueDelete, queueUpsert } from '../lib/offline/syncHelpers';

const MAX_FORECASTS = 365;
const ACTION_SUCCESS_THRESHOLD = 50;

function toDayNumber(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getTime();
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.filter(Boolean).map(value => String(value).trim()))).filter(Boolean);
}

function normalizeExperiment(experiment = {}, prediction = {}) {
  const plannedSuggestions = uniqueStrings(
    Array.isArray(experiment?.plannedSuggestions)
      ? experiment.plannedSuggestions
      : Array.isArray(prediction?.suggestions)
        ? prediction.suggestions
        : [],
  );

  const selectedActions = uniqueStrings(
    Array.isArray(experiment?.selectedActions)
      ? experiment.selectedActions
      : Array.isArray(experiment?.completedSuggestions)
        ? experiment.completedSuggestions
        : [],
  ).filter(action => plannedSuggestions.includes(action));

  const completionBase = selectedActions.length > 0 ? selectedActions : plannedSuggestions;
  const completedSuggestions = uniqueStrings(experiment?.completedSuggestions || [])
    .filter(action => completionBase.includes(action));

  const actionFeedback = Object.fromEntries(
    Object.entries(experiment?.actionFeedback || {})
      .filter(([action, feedback]) => completionBase.includes(action) && Boolean(feedback)),
  );

  const completionRate = completionBase.length > 0
    ? Math.round((completedSuggestions.length / completionBase.length) * 100)
    : 0;

  return {
    plannedSuggestions,
    selectedActions,
    completedSuggestions,
    actionFeedback,
    completionRate,
    reviewedAt: experiment?.reviewedAt || null,
    updatedAt: experiment?.updatedAt || new Date().toISOString(),
  };
}

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
          const suggestions = Array.isArray(result.data?.suggestions)
            ? result.data.suggestions.filter(Boolean)
            : [];

          const forecast = {
            id: generateId(),
            userId,
            date: targetDate,
            prediction: result.data,
            actual: null,
            accuracy: null,
            experiment: normalizeExperiment({
              plannedSuggestions: suggestions,
              selectedActions: [],
              completedSuggestions: [],
              actionFeedback: {},
              reviewedAt: null,
            }, result.data),
            createdAt: new Date().toISOString(),
            ...createSyncMetadata(),
          };

          set((state) => ({
            forecasts: [forecast, ...state.forecasts].slice(0, MAX_FORECASTS),
            isGenerating: false,
          }));
          queueUpsert('forecasts', forecast);

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
       * @param {Array<string>} [actual.reasons] - 예보 평가 이유 태그
       * @param {'hit'|'miss'|'partial'} [actual.outcome] - 예보 평가 결과
       * @param {string} [actual.recordedAt] - 기록 시각 ISO 문자열
       */
      recordActual: (forecastId, actual) => {
        const forecast = get().forecasts.find(f => f.id === forecastId);
        if (!forecast?.prediction) return;
        if (typeof actual?.condition !== 'number') return;

        const normalizedActual = {
          ...actual,
          reasons: Array.isArray(actual?.reasons) ? actual.reasons : [],
          outcome: actual?.outcome || 'partial',
          recordedAt: actual?.recordedAt || new Date().toISOString(),
        };

        // 컨디션 기반 정확도 (1-5 스케일, 차이 1당 -25%)
        const conditionDiff = Math.abs(forecast.prediction.condition - normalizedActual.condition);
        const accuracy = Math.max(0, Math.round(100 - conditionDiff * 25));
        const wasAccurate = normalizedActual.outcome === 'hit'
          ? true
          : normalizedActual.outcome === 'miss'
            ? false
            : accuracy >= 75;

        set((state) => ({
          forecasts: state.forecasts.map(f =>
            f.id === forecastId
              ? { ...f, actual: normalizedActual, accuracy, ...createSyncMetadata() }
              : f
          ),
        }));
        const updatedForecast = get().getForecastById(forecastId);
        if (updatedForecast) {
          queueUpsert('forecasts', updatedForecast);
        }

        analytics.track(analytics.events.FORECAST_FEEDBACK, {
          was_accurate: wasAccurate,
        });
      },

      /**
       * 추천 행동 실천 토글
       * @param {string} forecastId
       * @param {string} suggestion
       */
      toggleActionSuggestion: (forecastId, suggestion) => {
        if (!suggestion) return;

        set((state) => ({
          forecasts: state.forecasts.map((forecast) => {
            if (forecast.id !== forecastId) return forecast;

            const experiment = normalizeExperiment(forecast.experiment, forecast.prediction);
            const planned = experiment.plannedSuggestions;

            if (!planned.includes(suggestion)) return forecast;

            const nextSelected = experiment.selectedActions.includes(suggestion)
              ? experiment.selectedActions.filter(action => action !== suggestion)
              : [...experiment.selectedActions, suggestion];

            const nextCompleted = experiment.completedSuggestions
              .filter(action => nextSelected.length === 0 || nextSelected.includes(action));

            const nextFeedback = Object.fromEntries(
              Object.entries(experiment.actionFeedback || {})
                .filter(([action]) => nextSelected.length === 0 || nextSelected.includes(action)),
            );

            return {
              ...forecast,
              experiment: normalizeExperiment({
                ...experiment,
                selectedActions: nextSelected,
                completedSuggestions: nextCompleted,
                actionFeedback: nextFeedback,
                reviewedAt: experiment.reviewedAt,
                updatedAt: new Date().toISOString(),
              }, forecast.prediction),
              ...createSyncMetadata(),
            };
          }),
        }));
        const updatedForecast = get().getForecastById(forecastId);
        if (updatedForecast) {
          queueUpsert('forecasts', updatedForecast);
        }
      },

      reviewExperiment: (forecastId, { completedActions = [], actionFeedback = {} } = {}) => {
        set((state) => ({
          forecasts: state.forecasts.map((forecast) => {
            if (forecast.id !== forecastId) return forecast;

            const experiment = normalizeExperiment(forecast.experiment, forecast.prediction);
            const selectedActions = experiment.selectedActions.length > 0
              ? experiment.selectedActions
              : experiment.plannedSuggestions;

            const nextCompleted = uniqueStrings(completedActions)
              .filter(action => selectedActions.includes(action));

            const nextFeedback = Object.fromEntries(
              Object.entries(actionFeedback || {})
                .filter(([action, feedback]) => selectedActions.includes(action) && Boolean(feedback)),
            );

            return {
              ...forecast,
              experiment: normalizeExperiment({
                ...experiment,
                selectedActions,
                completedSuggestions: nextCompleted,
                actionFeedback: nextFeedback,
                reviewedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }, forecast.prediction),
              ...createSyncMetadata(),
            };
          }),
        }));

        const updatedForecast = get().getForecastById(forecastId);
        if (updatedForecast) {
          queueUpsert('forecasts', updatedForecast);
        }
      },

      /**
       * 특정 예보 조회
       * @param {string} forecastId
       * @returns {Object|undefined}
       */
      getForecastById: (forecastId) => {
        return get().forecasts.find(f => f.id === forecastId && !f.deletedAt);
      },

      /**
       * 특정 날짜 예보 조회
       * @param {string} userId
       * @param {string} date
       * @returns {Object|undefined}
       */
      getForecastByDate: (userId, date) => {
        return get().forecasts.find(f =>
          f.userId === userId && f.date === date && !f.deletedAt
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
          .filter(f => f.userId === userId && !f.deletedAt)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit);
      },

      /**
       * 정확도가 기록된 예보 목록
       * @param {string} userId
       * @returns {Array}
       */
      getVerifiedForecasts: (userId) => {
        return get().forecasts.filter(f =>
          f.userId === userId && !f.deletedAt && f.accuracy !== null
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
       * 최근 N일 행동 실험 통계
       * @param {string} userId
       * @param {number} [days=30]
       */
      getExperimentSummary: (userId, days = 30) => {
        const cutoff = toDayNumber(getTodayString()) - ((days - 1) * 24 * 60 * 60 * 1000);
        const withActual = get().forecasts.filter((forecast) =>
          forecast.userId === userId &&
          !forecast.deletedAt &&
          typeof forecast.actual?.condition === 'number' &&
          normalizeExperiment(forecast.experiment, forecast.prediction).plannedSuggestions.length > 0 &&
          toDayNumber(forecast.date) >= cutoff
        );

        if (withActual.length === 0) {
          return {
            sampleSize: 0,
            highCompletionDays: 0,
            lowCompletionDays: 0,
            avgConditionHighCompletion: 0,
            avgConditionLowCompletion: 0,
            improvement: 0,
            topHelpfulActions: [],
          };
        }

        const highCompletion = withActual.filter((forecast) => {
          const experiment = normalizeExperiment(forecast.experiment, forecast.prediction);
          return experiment.completionRate >= ACTION_SUCCESS_THRESHOLD;
        });
        const lowCompletion = withActual.filter((forecast) => {
          const experiment = normalizeExperiment(forecast.experiment, forecast.prediction);
          return experiment.completionRate < ACTION_SUCCESS_THRESHOLD;
        });

        const helpfulActionCounter = {};
        for (const forecast of withActual) {
          const experiment = normalizeExperiment(forecast.experiment, forecast.prediction);
          Object.entries(experiment.actionFeedback || {}).forEach(([action, feedback]) => {
            if (feedback === 'helpful') {
              helpfulActionCounter[action] = (helpfulActionCounter[action] || 0) + 1;
            }
          });
        }

        const topHelpfulActions = Object.entries(helpfulActionCounter)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([action, helpfulCount]) => ({ action, helpfulCount }));

        const avgConditionHighCompletion = average(highCompletion.map(f => f.actual.condition));
        const avgConditionLowCompletion = average(lowCompletion.map(f => f.actual.condition));

        return {
          sampleSize: withActual.length,
          highCompletionDays: highCompletion.length,
          lowCompletionDays: lowCompletion.length,
          avgConditionHighCompletion: Math.round(avgConditionHighCompletion * 10) / 10,
          avgConditionLowCompletion: Math.round(avgConditionLowCompletion * 10) / 10,
          improvement: Math.round((avgConditionHighCompletion - avgConditionLowCompletion) * 10) / 10,
          topHelpfulActions,
        };
      },

      /**
       * 최근 N일 예보 검증 통계
       * @param {string} userId
       * @param {number} [days=30]
       */
      getReviewStats: (userId, days = 30) => {
        const cutoff = toDayNumber(getTodayString()) - ((days - 1) * 24 * 60 * 60 * 1000);
        const verified = get().forecasts.filter((forecast) =>
          forecast.userId === userId &&
          !forecast.deletedAt &&
          forecast.actual &&
          toDayNumber(forecast.date) >= cutoff,
        );

        const hitCount = verified.filter(f => f.actual?.outcome === 'hit').length;
        const missCount = verified.filter(f => f.actual?.outcome === 'miss').length;
        const partialCount = verified.filter(
          f => !f.actual?.outcome || f.actual.outcome === 'partial',
        ).length;

        return {
          verifiedCount: verified.length,
          hitCount,
          missCount,
          partialCount,
        };
      },

      /**
       * 예보 삭제
       * @param {string} forecastId
       */
      deleteForecast: (forecastId) => {
        const existing = get().forecasts.find(forecast => forecast.id === forecastId);
        set((state) => ({
          forecasts: state.forecasts.filter(f => f.id !== forecastId),
        }));
        if (existing) {
          queueDelete('forecasts', existing);
        }
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
      version: 2,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        forecasts: state.forecasts,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        const next = { .../** @type {any} */ (persisted) };
        next.forecasts = Array.isArray(next.forecasts)
          ? next.forecasts.map((forecast) => ({
            ...forecast,
            experiment: normalizeExperiment(forecast.experiment, forecast.prediction),
          }))
          : [];
        return next;
      },
    }
  )
);

export default useForecastStore;
