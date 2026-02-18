/**
 * DreamSync App Root
 */
import { useEffect, useState } from 'react';
import { initCapacitor } from './lib/capacitor';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { PageLoading } from './components/common/Loading';
import Router from './Router';
import { initializeAdapters, setAIAdapter } from './lib/adapters';
import { initSyncQueue, disposeSyncQueue } from './lib/offline/syncQueue';
import useFeatureFlagStore from './store/useFeatureFlagStore';
import logger from './lib/utils/logger';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribeFlags;
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
