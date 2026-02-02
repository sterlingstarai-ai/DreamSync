import { useEffect } from 'react';
import { initCapacitor, isNative } from '@/lib/capacitor';
import { useAppStore } from '@/store/useAppStore';

function App() {
  const { isLoading, setLoading } = useAppStore();

  useEffect(() => {
    async function init() {
      try {
        await initCapacitor();
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [setLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-area-top safe-area-bottom">
      <header className="bg-indigo-600 text-white p-4">
        <h1 className="text-xl font-bold">DreamSync</h1>
      </header>

      <main className="p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome to DreamSync</h2>
          <p className="text-gray-600 mb-4">
            Your app is ready. Start building!
          </p>
          <p className="text-sm text-gray-400">
            Platform: {isNative ? 'Native' : 'Web'}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
