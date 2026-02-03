/**
 * 앱 설정 상태 관리 스토어
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/adapters/storage';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // 상태
      theme: 'dark', // 'dark' | 'light' | 'system'
      language: 'ko',
      notifications: {
        enabled: true,
        morningReminder: true,
        morningTime: '07:00',
        eveningReminder: true,
        eveningTime: '21:00',
        weeklyReport: true,
      },
      privacy: {
        analytics: true,
        crashReports: true,
      },
      display: {
        showEmoji: true,
        compactMode: false,
        fontSize: 'medium', // 'small' | 'medium' | 'large'
      },

      // 액션
      /**
       * 테마 설정
       * @param {'dark' | 'light' | 'system'} theme
       */
      setTheme: (theme) => {
        set({ theme });
        // CSS 변수 적용은 별도 hook에서 처리
      },

      /**
       * 언어 설정
       * @param {string} language
       */
      setLanguage: (language) => {
        set({ language });
      },

      /**
       * 알림 설정 업데이트
       * @param {Object} settings
       */
      updateNotifications: (settings) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            ...settings,
          },
        }));
      },

      /**
       * 개인정보 설정 업데이트
       * @param {Object} settings
       */
      updatePrivacy: (settings) => {
        set((state) => ({
          privacy: {
            ...state.privacy,
            ...settings,
          },
        }));
      },

      /**
       * 디스플레이 설정 업데이트
       * @param {Object} settings
       */
      updateDisplay: (settings) => {
        set((state) => ({
          display: {
            ...state.display,
            ...settings,
          },
        }));
      },

      /**
       * 전체 설정 가져오기
       * @returns {Object}
       */
      getAllSettings: () => {
        const state = get();
        return {
          theme: state.theme,
          language: state.language,
          notifications: state.notifications,
          privacy: state.privacy,
          display: state.display,
        };
      },

      /**
       * 설정 초기화
       */
      resetSettings: () => {
        set({
          theme: 'dark',
          language: 'ko',
          notifications: {
            enabled: true,
            morningReminder: true,
            morningTime: '07:00',
            eveningReminder: true,
            eveningTime: '21:00',
            weeklyReport: true,
          },
          privacy: {
            analytics: true,
            crashReports: true,
          },
          display: {
            showEmoji: true,
            compactMode: false,
            fontSize: 'medium',
          },
        });
      },
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useSettingsStore;
