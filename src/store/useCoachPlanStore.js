/**
 * 코치 플랜 상태 관리 스토어
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getRecentDays, getTodayString } from '../lib/utils/date';
import { zustandStorage } from '../lib/adapters/storage';

const MAX_DAILY_TASKS = 8;

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function calcCompletionRate(tasks = []) {
  if (!tasks.length) return 0;
  const completed = tasks.filter(task => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

function sanitizeTasks(tasks = []) {
  return tasks
    .filter(task => normalizeText(task?.title))
    .slice(0, MAX_DAILY_TASKS)
    .map((task, index) => ({
      id: task.id || `coach-task-${index + 1}`,
      title: String(task.title).trim(),
      source: task.source || 'forecast',
      priority: typeof task.priority === 'number' ? task.priority : 1,
      estimatedMinutes: typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : 0,
      completed: Boolean(task.completed),
      completedAt: task.completed ? (task.completedAt || new Date().toISOString()) : null,
    }));
}

function mergeTasks(existingTasks = [], nextTasks = []) {
  const existingByTitle = Object.fromEntries(
    existingTasks.map(task => [normalizeText(task.title), task]),
  );

  return nextTasks.map((task) => {
    const existing = existingByTitle[normalizeText(task.title)];
    if (!existing) return task;
    return {
      ...task,
      completed: existing.completed,
      completedAt: existing.completed ? (existing.completedAt || task.completedAt) : null,
    };
  });
}

const useCoachPlanStore = create(
  persist(
    (set, get) => ({
      plansByUser: {},

      /**
       * 특정 날짜 플랜 조회
       * @param {string} userId
       * @param {string} date
       */
      getPlan: (userId, date) => {
        if (!userId || !date) return null;
        return get().plansByUser[userId]?.[date] || null;
      },

      /**
       * 오늘 플랜 조회
       * @param {string} userId
       */
      getTodayPlan: (userId) => {
        return get().getPlan(userId, getTodayString());
      },

      /**
       * 오늘 플랜 생성/갱신
       * 기존 완료 상태를 동일 제목 기준으로 보존한다.
       * @param {Object} params
       * @param {string} params.userId
       * @param {Array} [params.tasks=[]]
       * @param {string} [params.date]
       */
      upsertTodayPlan: ({ userId, tasks = [], date = getTodayString() }) => {
        if (!userId) return null;
        const sanitized = sanitizeTasks(tasks);

        set((state) => {
          const userPlans = state.plansByUser[userId] || {};
          const existing = userPlans[date] || null;
          const mergedTasks = existing
            ? mergeTasks(existing.tasks || [], sanitized)
            : sanitized;

          const nextPlan = {
            date,
            tasks: mergedTasks,
            completionRate: calcCompletionRate(mergedTasks),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            plansByUser: {
              ...state.plansByUser,
              [userId]: {
                ...userPlans,
                [date]: nextPlan,
              },
            },
          };
        });

        return get().getPlan(userId, date);
      },

      /**
       * 플랜 태스크 완료 토글
       * @param {string} userId
       * @param {string} date
       * @param {string} taskId
       */
      toggleTask: (userId, date, taskId) => {
        if (!userId || !date || !taskId) return;

        set((state) => {
          const userPlans = state.plansByUser[userId] || {};
          const plan = userPlans[date];
          if (!plan) return state;

          const nextTasks = (plan.tasks || []).map((task) => {
            if (task.id !== taskId) return task;
            const completed = !task.completed;
            return {
              ...task,
              completed,
              completedAt: completed ? new Date().toISOString() : null,
            };
          });

          return {
            plansByUser: {
              ...state.plansByUser,
              [userId]: {
                ...userPlans,
                [date]: {
                  ...plan,
                  tasks: nextTasks,
                  completionRate: calcCompletionRate(nextTasks),
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      /**
       * 최근 N일 코치 플랜 통계
       * @param {string} userId
       * @param {number} [days=7]
       */
      getRecentPlanStats: (userId, days = 7) => {
        if (!userId) {
          return {
            days,
            activeDays: 0,
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
          };
        }

        const dates = new Set(getRecentDays(days));
        const plans = Object.values(get().plansByUser[userId] || {})
          .filter(plan => dates.has(plan.date));

        const totalTasks = plans.reduce((sum, plan) => sum + (plan.tasks?.length || 0), 0);
        const completedTasks = plans.reduce(
          (sum, plan) => sum + (plan.tasks || []).filter(task => task.completed).length,
          0,
        );
        const activeDays = plans.filter(plan => (plan.tasks?.length || 0) > 0).length;

        return {
          days,
          activeDays,
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0,
        };
      },

      reset: () => {
        set({ plansByUser: {} });
      },
    }),
    {
      name: 'coach-plans',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        plansByUser: state.plansByUser,
      }),
    },
  ),
);

export default useCoachPlanStore;
