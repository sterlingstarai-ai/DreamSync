/**
 * 체크인 데이터 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { getTodayString, getRecentDays, toDateString } from '../lib/utils/date';
import { zustandStorage } from '../lib/adapters/storage';

const MAX_CHECKINS = 365;

const useCheckInStore = create(
  persist(
    (set, get) => ({
      // 상태
      logs: [],
      isLoading: false,
      error: null,

      // 액션
      /**
       * 새 체크인 기록 추가
       * @param {Object} params
       * @param {string} params.userId
       * @param {number} params.condition - 1-5
       * @param {string[]} params.emotions
       * @param {number} params.stressLevel - 1-5
       * @param {string[]} params.events
       * @param {string} [params.note]
       * @param {Object} [params.sleep]
       */
      addCheckIn: async ({
        userId,
        condition,
        emotions,
        stressLevel,
        events,
        note,
        sleep,
      }) => {
        set({ isLoading: true, error: null });

        const today = getTodayString();
        const existingLog = get().getLogByDate(userId, today);

        // 오늘 이미 체크인했으면 업데이트
        if (existingLog) {
          return get().updateCheckIn(existingLog.id, {
            condition,
            emotions,
            stressLevel,
            events,
            note,
            sleep,
          });
        }

        const log = {
          id: generateId(),
          userId,
          date: today,
          condition,
          emotions,
          stressLevel,
          events,
          note: note || null,
          sleep: sleep || null,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          logs: [log, ...state.logs].slice(0, MAX_CHECKINS),
          isLoading: false,
        }));

        return log;
      },

      /**
       * 체크인 업데이트
       * @param {string} logId
       * @param {Object} updates
       */
      updateCheckIn: (logId, updates) => {
        set((state) => ({
          logs: state.logs.map(log =>
            log.id === logId
              ? { ...log, ...updates }
              : log
          ),
          isLoading: false,
        }));

        return get().logs.find(log => log.id === logId);
      },

      /**
       * 체크인 삭제
       * @param {string} logId
       */
      deleteCheckIn: (logId) => {
        set((state) => ({
          logs: state.logs.filter(log => log.id !== logId),
        }));
      },

      /**
       * 특정 체크인 조회
       * @param {string} logId
       * @returns {Object|undefined}
       */
      getLogById: (logId) => {
        return get().logs.find(log => log.id === logId);
      },

      /**
       * 특정 날짜 체크인 조회
       * @param {string} userId
       * @param {string} date - YYYY-MM-DD
       * @returns {Object|undefined}
       */
      getLogByDate: (userId, date) => {
        return get().logs.find(log =>
          log.userId === userId && log.date === date
        );
      },

      /**
       * 오늘 체크인 조회
       * @param {string} userId
       * @returns {Object|undefined}
       */
      getTodayLog: (userId) => {
        return get().getLogByDate(userId, getTodayString());
      },

      /**
       * 오늘 체크인 여부
       * @param {string} userId
       * @returns {boolean}
       */
      hasCheckedInToday: (userId) => {
        return !!get().getTodayLog(userId);
      },

      /**
       * 최근 N일간의 체크인 조회
       * @param {string} userId
       * @param {number} days
       * @returns {Array}
       */
      getRecentLogs: (userId, days = 7) => {
        const dates = getRecentDays(days);
        return get().logs.filter(log =>
          log.userId === userId && dates.includes(log.date)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      /**
       * 체크인 연속 기록 (Streak)
       * @param {string} userId
       * @returns {number}
       */
      getStreak: (userId) => {
        const logs = get().logs.filter(log => log.userId === userId);
        const dates = new Set(logs.map(log => log.date));

        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = toDateString(checkDate);

          if (dates.has(dateStr)) {
            streak++;
          } else if (i > 0) {
            // 오늘이 아닌 경우만 연속 끊김
            break;
          }
        }

        return streak;
      },

      /**
       * 평균 컨디션 계산
       * @param {string} userId
       * @param {number} days
       * @returns {number}
       */
      getAverageCondition: (userId, days = 7) => {
        const logs = get().getRecentLogs(userId, days);
        if (logs.length === 0) return 0;

        const sum = logs.reduce((acc, log) => acc + log.condition, 0);
        return Math.round((sum / logs.length) * 10) / 10;
      },

      /**
       * 주간 체크인 완료율
       * @param {string} userId
       * @returns {number} 0-100
       */
      getWeeklyCompletionRate: (userId) => {
        const logs = get().getRecentLogs(userId, 7);
        return Math.round((logs.length / 7) * 100);
      },

      /**
       * 가장 많이 선택된 감정
       * @param {string} userId
       * @param {number} days
       * @returns {Array}
       */
      getTopEmotions: (userId, days = 7) => {
        const logs = get().getRecentLogs(userId, days);
        const emotionCount = {};

        for (const log of logs) {
          for (const emotion of log.emotions) {
            emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
          }
        }

        return Object.entries(emotionCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([emotion, count]) => ({ emotion, count }));
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
          logs: [],
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'checkins',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        logs: state.logs,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useCheckInStore;
