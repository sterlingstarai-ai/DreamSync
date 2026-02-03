/**
 * Feature Flag 상태 관리 스토어
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_INFO, isFlagAvailable } from '../constants/featureFlags';
import { Capacitor } from '@capacitor/core';
import { zustandStorage } from '../lib/adapters/storage';
import logger from '../lib/utils/logger';

/**
 * 현재 플랫폼 가져오기
 */
function getCurrentPlatform() {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'ios' | 'android'
  }
  return 'web';
}

const useFeatureFlagStore = create(
  persist(
    (set, get) => ({
      // 상태
      flags: { ...DEFAULT_FEATURE_FLAGS },
      platform: getCurrentPlatform(),

      // 액션
      /**
       * 특정 플래그 값 가져오기
       * @param {string} key
       * @returns {boolean}
       */
      getFlag: (key) => {
        const { flags, platform } = get();

        // 플랫폼 제한 확인
        if (!isFlagAvailable(key, platform)) {
          return false;
        }

        return flags[key] ?? DEFAULT_FEATURE_FLAGS[key] ?? false;
      },

      /**
       * 플래그 설정
       * @param {string} key
       * @param {boolean} value
       */
      setFlag: (key, value) => {
        const { flags, platform } = get();

        // 플랫폼 제한 확인
        if (!isFlagAvailable(key, platform)) {
          logger.warn(`Flag "${key}" is not available on ${platform}`);
          return;
        }

        set({
          flags: {
            ...flags,
            [key]: value,
          },
        });
      },

      /**
       * 여러 플래그 한번에 설정
       * @param {Object} newFlags
       */
      setFlags: (newFlags) => {
        const { flags, platform } = get();
        const validFlags = {};

        for (const [key, value] of Object.entries(newFlags)) {
          if (isFlagAvailable(key, platform)) {
            validFlags[key] = value;
          }
        }

        set({
          flags: {
            ...flags,
            ...validFlags,
          },
        });
      },

      /**
       * 플래그 토글
       * @param {string} key
       */
      toggleFlag: (key) => {
        const { flags, getFlag } = get();
        const currentValue = getFlag(key);

        set({
          flags: {
            ...flags,
            [key]: !currentValue,
          },
        });
      },

      /**
       * 플래그 정보 가져오기
       * @param {string} key
       * @returns {Object|null}
       */
      getFlagInfo: (key) => {
        return FEATURE_FLAG_INFO[key] || null;
      },

      /**
       * 사용 가능한 플래그 목록
       * @returns {string[]}
       */
      getAvailableFlags: () => {
        const { platform } = get();
        return Object.keys(FEATURE_FLAG_INFO).filter(key =>
          isFlagAvailable(key, platform)
        );
      },

      /**
       * 플래그 초기화
       */
      resetFlags: () => {
        set({ flags: { ...DEFAULT_FEATURE_FLAGS } });
      },
    }),
    {
      name: 'features',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        flags: state.flags,
      }),
      migrate: (persisted, version) => {
        if (version === 0) return { .../** @type {any} */ (persisted) };
        return persisted;
      },
    }
  )
);

export default useFeatureFlagStore;
