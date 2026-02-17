/**
 * 주간 코치 목표 스토어
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getRecentDays } from '../lib/utils/date';
import { zustandStorage } from '../lib/adapters/storage';

export const DEFAULT_WEEKLY_GOALS = {
  checkInDays: 5,
  dreamCount: 4,
  avgSleepHours: 7,
};

function clampPositiveNumber(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function calcRate(current, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

const useGoalStore = create(
  persist(
    (set, get) => ({
      goalsByUser: {},

      /**
       * 사용자 목표 조회
       * @param {string} userId
       */
      getGoals: (userId) => {
        if (!userId) return DEFAULT_WEEKLY_GOALS;
        return {
          ...DEFAULT_WEEKLY_GOALS,
          ...(get().goalsByUser[userId] || {}),
        };
      },

      /**
       * 사용자 목표 업데이트
       * @param {string} userId
       * @param {Object} updates
       */
      updateGoals: (userId, updates) => {
        if (!userId) return;
        const current = get().getGoals(userId);
        const next = {
          checkInDays: clampPositiveNumber(updates?.checkInDays, current.checkInDays),
          dreamCount: clampPositiveNumber(updates?.dreamCount, current.dreamCount),
          avgSleepHours: clampPositiveNumber(updates?.avgSleepHours, current.avgSleepHours),
        };

        set((state) => ({
          goalsByUser: {
            ...state.goalsByUser,
            [userId]: next,
          },
        }));
      },

      /**
       * 주간 목표 달성률 계산
       * @param {string} userId
       * @param {Object} params
       * @param {Array} [params.logs=[]]
       * @param {Array} [params.dreams=[]]
       */
      getWeeklyProgress: (userId, { logs = [], dreams = [] } = {}) => {
        const goals = get().getGoals(userId);
        const recentDays = new Set(getRecentDays(7));

        const weekLogs = logs.filter(log => recentDays.has(log.date));
        const weekDreams = dreams.filter((dream) => {
          const dreamDate = dream.date || (dream.createdAt || '').split('T')[0];
          return recentDays.has(dreamDate);
        });

        const checkInDays = new Set(weekLogs.map(log => log.date)).size;
        const dreamCount = weekDreams.length;
        const sleepHoursList = weekLogs
          .filter(log => typeof log.sleep?.duration === 'number')
          .map(log => log.sleep.duration / 60);
        const avgSleepHours = sleepHoursList.length > 0
          ? Math.round((sleepHoursList.reduce((sum, hour) => sum + hour, 0) / sleepHoursList.length) * 10) / 10
          : 0;

        return {
          goals,
          metrics: {
            checkInDays,
            dreamCount,
            avgSleepHours,
          },
          progress: {
            checkInDays: {
              current: checkInDays,
              target: goals.checkInDays,
              rate: calcRate(checkInDays, goals.checkInDays),
              achieved: checkInDays >= goals.checkInDays,
            },
            dreamCount: {
              current: dreamCount,
              target: goals.dreamCount,
              rate: calcRate(dreamCount, goals.dreamCount),
              achieved: dreamCount >= goals.dreamCount,
            },
            avgSleepHours: {
              current: avgSleepHours,
              target: goals.avgSleepHours,
              rate: calcRate(avgSleepHours, goals.avgSleepHours),
              achieved: avgSleepHours >= goals.avgSleepHours,
            },
          },
        };
      },

      reset: () => {
        set({ goalsByUser: {} });
      },
    }),
    {
      name: 'weekly-goals',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        goalsByUser: state.goalsByUser,
      }),
    },
  ),
);

export default useGoalStore;
