/**
 * 인증 상태 관리 스토어
 * 1단계: 로컬 스토리지 기반
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/utils/id';
import { zustandStorage } from '../lib/adapters/storage';
import analytics from '../lib/adapters/analytics';

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_HASH_VERSION = 1;

/**
 * 기본 사용자 설정
 */
const defaultSettings = {
  notifications: true,
  reminderTime: '21:00',
  theme: 'dark',
  language: 'ko',
};

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  const protocol = window.location?.protocol || '';
  if (protocol === 'capacitor:') return 'ios';
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  if (/android/i.test(userAgent)) return 'android';
  return 'web';
}

function getAuthMethod(email = '') {
  return normalizeEmail(email).startsWith('guest@') ? 'guest' : 'email';
}

function createSalt() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

async function hashPassword(password, salt) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    let hash = 0;
    const input = `${salt}:${password}`;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return `legacy_${Math.abs(hash).toString(16)}`;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createCredential(password) {
  const passwordSalt = createSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  return {
    passwordSalt,
    passwordHash,
    passwordHashVersion: PASSWORD_HASH_VERSION,
  };
}

async function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt || !password) return false;
  const computed = await hashPassword(password, user.passwordSalt);
  return computed === user.passwordHash;
}

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
      signUp: async ({ email, password, name }) => {
        set({ isLoading: true });

        // 시뮬레이션 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !password) {
          set({ isLoading: false });
          return { success: false, error: '이메일과 비밀번호를 입력해주세요.' };
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          set({ isLoading: false });
          return { success: false, error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
        }

        const credential = await createCredential(password);
        const user = {
          id: generateId(),
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          avatar: null,
          settings: defaultSettings,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          ...credential,
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        analytics.identify(user.id, {
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          platform: getPlatform(),
          appVersion: import.meta.env.VITE_APP_VERSION || '0.0.1',
        });
        analytics.setUserProperties({
          $name: user.name,
          $email: user.email,
          signup_date: user.createdAt,
          platform: getPlatform(),
          onboarding_completed: false,
        });
        analytics.track(analytics.events.AUTH_SIGNUP, {
          method: getAuthMethod(user.email),
        });

        return { success: true, user };
      },

      /**
       * 로그인 (로컬)
       * @param {Object} params
       * @param {string} params.email
       * @param {string} params.password
       */
      signIn: async ({ email, password }) => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 500));

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !password) {
          set({ isLoading: false });
          return { success: false, error: '이메일과 비밀번호를 입력해주세요.' };
        }

        // 로컬 저장된 사용자만 로그인 허용
        const currentUser = get().user;
        if (!currentUser || currentUser.email !== normalizedEmail) {
          set({ isLoading: false });
          return { success: false, error: '등록되지 않은 이메일입니다. 회원가입 후 이용해주세요.' };
        }

        // 레거시 계정(해시 없는 기존 데이터)은 최초 로그인 시 보안 업그레이드
        if (!currentUser.passwordHash || !currentUser.passwordSalt) {
          const upgraded = {
            ...currentUser,
            ...(await createCredential(password)),
          };
          set({
            user: upgraded,
            isAuthenticated: true,
            isLoading: false,
          });
          analytics.identify(upgraded.id, {
            name: upgraded.name,
            email: upgraded.email,
            createdAt: upgraded.createdAt,
            platform: getPlatform(),
            appVersion: import.meta.env.VITE_APP_VERSION || '0.0.1',
          });
          analytics.track(analytics.events.AUTH_LOGIN, {
            method: getAuthMethod(upgraded.email),
          });
          return { success: true, user: upgraded };
        }

        const isValidPassword = await verifyPassword(currentUser, password);
        if (!isValidPassword) {
          set({ isLoading: false });
          return { success: false, error: '비밀번호가 올바르지 않습니다.' };
        }

        set({
          isAuthenticated: true,
          isLoading: false,
        });

        analytics.identify(currentUser.id, {
          name: currentUser.name,
          email: currentUser.email,
          createdAt: currentUser.createdAt,
          platform: getPlatform(),
          appVersion: import.meta.env.VITE_APP_VERSION || '0.0.1',
        });
        analytics.track(analytics.events.AUTH_LOGIN, {
          method: getAuthMethod(currentUser.email),
        });

        return { success: true, user: currentUser };
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

        analytics.track(analytics.events.AUTH_LOGOUT);
        analytics.reset();

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
        if (updates?.name) {
          analytics.setUserProperty('$name', updates.name);
        }
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
        analytics.setUserProperty('onboarding_completed', true);
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
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useAuthStore;
