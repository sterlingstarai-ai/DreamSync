/**
 * 인증 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { zustandStorage } from '../lib/adapters/storage';

/**
 * 기본 사용자 설정
 */
const defaultSettings = {
  notifications: true,
  reminderTime: '21:00',
  theme: 'dark',
  language: 'ko',
};

/**
 * @typedef {Object} AuthState
 * @property {Object|null} user - 현재 사용자
 * @property {boolean} isAuthenticated - 인증 여부
 * @property {boolean} isLoading - 로딩 상태
 */

const useAuthStore = create(
  persist(
    (set, get) => ({
      // 상태
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // 액션
      /**
       * 회원가입 (로컬)
       * @param {Object} params
       * @param {string} params.email
       * @param {string} params.password
       * @param {string} [params.name]
       */
      signUp: async ({ email, name }) => {
        set({ isLoading: true });

        // 시뮬레이션 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = {
          id: generateId(),
          email,
          name: name || email.split('@')[0],
          avatar: null,
          settings: defaultSettings,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true, user };
      },

      /**
       * 로그인 (로컬)
       * @param {Object} params
       * @param {string} params.email
       * @param {string} params.password
       */
      signIn: async ({ email }) => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 500));

        // 로컬 저장된 사용자가 있으면 복원, 없으면 새로 생성
        const currentUser = get().user;

        if (currentUser && currentUser.email === email) {
          set({
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, user: currentUser };
        }

        // 새 사용자 생성 (1단계에서는 간단한 처리)
        const user = {
          id: generateId(),
          email,
          name: email.split('@')[0],
          avatar: null,
          settings: defaultSettings,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true, user };
      },

      /**
       * 로그아웃
       */
      signOut: async () => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 300));

        set({
          isAuthenticated: false,
          isLoading: false,
          // user는 유지 (다음 로그인 시 복원)
        });

        return { success: true };
      },

      /**
       * 사용자 정보 업데이트
       * @param {Object} updates
       */
      updateUser: (updates) => {
        const { user } = get();
        if (!user) return;

        set({
          user: {
            ...user,
            ...updates,
          },
        });
      },

      /**
       * 사용자 설정 업데이트
       * @param {Object} settings
       */
      updateSettings: (settings) => {
        const { user } = get();
        if (!user) return;

        set({
          user: {
            ...user,
            settings: {
              ...user.settings,
              ...settings,
            },
          },
        });
      },

      /**
       * 온보딩 완료 처리
       */
      completeOnboarding: () => {
        const { user } = get();
        if (!user) return;

        set({
          user: {
            ...user,
            onboardingCompleted: true,
          },
        });
      },

      /**
       * 상태 초기화 (개발용)
       */
      reset: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
