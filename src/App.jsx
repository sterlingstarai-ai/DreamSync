/**
 * DreamSync App Root
 */
import { useEffect, useState } from 'react';
import { initCapacitor } from './lib/capacitor';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { PageLoading } from './components/common/Loading';
import Router from './Router';
import { analytics, initializeAdapters, setAIAdapter } from './lib/adapters';
import { initSyncQueue, disposeSyncQueue } from './lib/offline/syncQueue';
import useFeatureFlagStore from './store/useFeatureFlagStore';
import useAuthStore from './store/useAuthStore';
import useSyncStatusStore from './store/useSyncStatusStore';
import logger from './lib/utils/logger';
import SentryAdapter from './lib/adapters/analytics/sentry';
import { getPlatformLabel } from './lib/platform';
import {
  getRuntimeConfig,
  validateRuntimeConfig,
  createRuntimeConfigError,
} from './lib/runtimeConfig';

function AppInitError({ error }) {
  const issues = Array.isArray(error?.issues) && error.issues.length > 0
    ? error.issues
    : [error?.message || '알 수 없는 초기화 오류가 발생했습니다.'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)] px-6">
      <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Startup Guard
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          앱 설정을 확인해야 합니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          잘못된 런타임 조합으로 앱이 반쯤 동작하는 상태를 막기 위해 초기화를 중단했습니다.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          {issues.map((issue) => (
            <li key={issue} className="rounded-2xl bg-red-50 px-4 py-3">
              {issue}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let unsubscribeFlags;
    let unsubscribeAuth;
    let unsubscribeSync;
    let disposeCapacitor;

    async function init() {
      try {
        // Capacitor 초기화
        disposeCapacitor = await initCapacitor();

        const runtimeConfig = getRuntimeConfig();
        const validation = validateRuntimeConfig(runtimeConfig);
        if (!validation.valid) {
          throw createRuntimeConfigError(validation.issues);
        }

        initializeAdapters({
          ai: runtimeConfig.ai,
          analytics: runtimeConfig.analytics,
          api: runtimeConfig.api,
        });

        if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('dreamsync_app_open_tracked')) {
          analytics.track(analytics.events.APP_OPEN, {
            platform: getPlatformLabel(),
            version: import.meta.env.VITE_APP_VERSION || '0.0.1',
          });
          sessionStorage.setItem('dreamsync_app_open_tracked', '1');
        }

        // Feature Flag edgeAI 값 동기화 (hydration 이후 변경도 반영)
        const applyEdgeAIFlag = (enabled) => {
          setAIAdapter(enabled ? 'edge' : (import.meta.env.VITE_AI || 'mock'));
        };

        const syncRemoteFlags = async (user) => {
          if (runtimeConfig.flags !== 'remote') return;
          await useFeatureFlagStore.getState().refreshRemoteFlags(user?.id);
        };

        applyEdgeAIFlag(useFeatureFlagStore.getState().getFlag('edgeAI'));
        unsubscribeFlags = useFeatureFlagStore.subscribe((state, prevState) => {
          if (state.flags.edgeAI !== prevState.flags.edgeAI) {
            applyEdgeAIFlag(state.flags.edgeAI);
          }
        });

        const applySentryUser = (user) => {
          if (user?.id) {
            SentryAdapter.setUser({ id: user.id });
          } else {
            SentryAdapter.setUser(null);
          }
        };
        applySentryUser(useAuthStore.getState().user);
        await syncRemoteFlags(useAuthStore.getState().user);
        unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
          if (state.user?.id !== prevState.user?.id) {
            applySentryUser(state.user);
            syncRemoteFlags(state.user).catch((error) => {
              logger.error('Remote flag sync error:', error);
            });
          }
        });

        const applySyncTags = (syncState) => {
          SentryAdapter.setTag('sync_status', syncState.status || 'idle');
          SentryAdapter.setTag('network_status', syncState.isOnline ? 'online' : 'offline');
        };
        applySyncTags(useSyncStatusStore.getState());
        unsubscribeSync = useSyncStatusStore.subscribe((state, prevState) => {
          if (state.status !== prevState.status || state.isOnline !== prevState.isOnline) {
            applySyncTags(state);
          }
        });

        // 오프라인 동기화 큐 초기화
        await initSyncQueue();

      } catch (error) {
        setInitError(error);
        logger.error('App init error:', error);
      } finally {
        setIsInitialized(true);
      }
    }
    init();

    return () => {
      if (typeof unsubscribeFlags === 'function') {
        unsubscribeFlags();
      }
      if (typeof unsubscribeAuth === 'function') {
        unsubscribeAuth();
      }
      if (typeof unsubscribeSync === 'function') {
        unsubscribeSync();
      }
      if (typeof disposeCapacitor === 'function') {
        disposeCapacitor().catch(() => {});
      }
      disposeSyncQueue().catch(() => {});
    };
  }, []);

  if (!isInitialized) {
    return <PageLoading message="DreamSync 로딩 중..." />;
  }

  if (initError) {
    return <AppInitError error={initError} />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
