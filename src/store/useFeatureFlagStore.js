/**
 * Feature Flag 상태 관리 스토어
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_INFO, isFlagAvailable } from '../constants/featureFlags';
import { zustandStorage } from '../lib/adapters/storage';
import { setAIAdapter } from '../lib/adapters';
import RemoteFlagsAdapter from '../lib/adapters/flags/remote';
import { getPlatformLabel } from '../lib/platform';
import logger from '../lib/utils/logger';

function getCurrentPlatform() {
  return getPlatformLabel();
}

function filterFlagsForPlatform(newFlags, platform) {
  const validFlags = {};

  for (const [key, value] of Object.entries(newFlags || {})) {
    if (isFlagAvailable(key, platform)) {
      validFlags[key] = Boolean(value);
    }
  }

  return validFlags;
}

const useFeatureFlagStore = create(
  persist(
    (set, get) => ({
      // 상태
      flags: { ...DEFAULT_FEATURE_FLAGS },
      platform: getCurrentPlatform(),
      lastRemoteSyncAt: null,
      lastRemoteError: null,

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

        // Edge AI 플래그는 어댑터를 즉시 전환
        if (key === 'edgeAI') {
          setAIAdapter(value ? 'edge' : 'mock');
        }
      },

      /**
       * 여러 플래그 한번에 설정
       * @param {Object} newFlags
       */
      setFlags: (newFlags) => {
        const { flags, platform } = get();
        const validFlags = filterFlagsForPlatform(newFlags, platform);

        set({
          flags: {
            ...flags,
            ...validFlags,
          },
        });

        if (typeof validFlags.edgeAI === 'boolean') {
          setAIAdapter(validFlags.edgeAI ? 'edge' : 'mock');
        }
      },

      /**
       * 플래그 토글
       * @param {string} key
       */
      toggleFlag: (key) => {
        const { flags, getFlag, platform } = get();

        if (!(key in DEFAULT_FEATURE_FLAGS)) {
          logger.warn(`Unknown flag key: "${key}"`);
          return;
        }
        if (!isFlagAvailable(key, platform)) {
          logger.warn(`Flag "${key}" is not available on ${platform}`);
          return;
        }

        const currentValue = getFlag(key);
        const nextValue = !currentValue;

        set({
          flags: {
            ...flags,
            [key]: nextValue,
          },
        });

        if (key === 'edgeAI') {
          setAIAdapter(nextValue ? 'edge' : 'mock');
        }
      },

      /**
       * 원격 플래그 동기화
       * @param {string | undefined} userId
       * @returns {Promise<Object>}
       */
      refreshRemoteFlags: async (userId) => {
        if (import.meta.env.VITE_FLAGS !== 'remote') {
          return get().flags;
        }

        try {
          const remoteFlags = await RemoteFlagsAdapter.getFlags(userId);
          const platform = get().platform;
          const nextFlags = {
            ...DEFAULT_FEATURE_FLAGS,
            ...filterFlagsForPlatform(remoteFlags, platform),
          };

          set({
            flags: nextFlags,
            lastRemoteSyncAt: Date.now(),
            lastRemoteError: null,
          });

          setAIAdapter(nextFlags.edgeAI ? 'edge' : 'mock');
          return nextFlags;
        } catch (error) {
          const message = error?.message || '원격 플래그를 불러오지 못했습니다.';
          set({ lastRemoteError: message });
          logger.error('[FeatureFlags] Remote sync failed:', error);
          return get().flags;
        }
      },

      clearRemoteFlagError: () => {
        set({ lastRemoteError: null });
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
        set({
          flags: { ...DEFAULT_FEATURE_FLAGS },
          lastRemoteSyncAt: null,
          lastRemoteError: null,
        });
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
