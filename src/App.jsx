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
import logger from './lib/utils/logger';
import SentryAdapter from './lib/adapters/analytics/sentry';

function getPlatformLabel() {
  if (typeof window === 'undefined') return 'web';
  const protocol = window.location?.protocol || '';
  if (protocol === 'capacitor:') return 'ios';
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  if (/android/i.test(userAgent)) return 'android';
  return 'web';
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribeFlags;
    let unsubscribeAuth;
    let disposeCapacitor;

    async function init() {
      try {
        // Capacitor 초기화
        disposeCapacitor = await initCapacitor();

        // Adapter 초기화 (환경 변수 기반)
        const config = {
          ai: import.meta.env.VITE_AI || 'mock',
          analytics: import.meta.env.VITE_ANALYTICS || 'mock',
          api: import.meta.env.VITE_BACKEND || 'local',
        };
        initializeAdapters(config);
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
        unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
          if (state.user?.id !== prevState.user?.id) {
            applySentryUser(state.user);
          }
        });

        // 오프라인 동기화 큐 초기화
        await initSyncQueue();

      } catch (error) {
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
      if (typeof disposeCapacitor === 'function') {
        disposeCapacitor().catch(() => {});
      }
      disposeSyncQueue().catch(() => {});
    };
  }, []);

  if (!isInitialized) {
    return <PageLoading message="DreamSync 로딩 중..." />;
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
