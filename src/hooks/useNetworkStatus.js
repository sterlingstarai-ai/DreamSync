/**
 * 네트워크 상태 훅
 * 온라인/오프라인 상태 및 동기화 큐 상태를 추적
 */
import { useState, useEffect } from 'react';
import { isOnline, getPendingCount, subscribe } from '../lib/offline/syncQueue';

export default function useNetworkStatus() {
  const [status, setStatus] = useState({
    isOnline: isOnline(),
    pendingCount: getPendingCount(),
  });

  useEffect(() => {
    const unsubscribe = subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    pendingCount: status.pendingCount,
    hasPendingSync: status.pendingCount > 0,
  };
}
