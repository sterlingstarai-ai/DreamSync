/**
 * DreamSync App Root
 */
import { useEffect, useState } from 'react';
import { initCapacitor } from './lib/capacitor';
import { ToastProvider } from './components/common/Toast';
import { PageLoading } from './components/common/Loading';
import Router from './Router';
import { initializeAdapters } from './lib/adapters';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Capacitor 초기화
        await initCapacitor();

        // Adapter 초기화 (환경 변수 기반)
        const config = {
          ai: import.meta.env.VITE_AI || 'mock',
          analytics: import.meta.env.VITE_ANALYTICS || 'mock',
          api: import.meta.env.VITE_BACKEND || 'local',
        };
        initializeAdapters(config);

      } catch (error) {
        console.error('App init error:', error);
      } finally {
        setIsInitialized(true);
      }
    }
    init();
  }, []);

  if (!isInitialized) {
    return <PageLoading message="DreamSync 로딩 중..." />;
  }

  return (
    <ToastProvider>
      <Router />
    </ToastProvider>
  );
}

export default App;
