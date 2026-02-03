/**
 * HealthKit/Health Connect 훅
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getHealthPlatform,
  requestHealthPermissions,
  checkHealthConnection,
  syncHealthData,
  getTodaySleepData,
  getSleepData,
} from '../lib/health/healthkit';
import { useFeatureFlags } from './useFeatureFlags';

export function useHealthKit() {
  const { isEnabled } = useFeatureFlags();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [todaySleep, setTodaySleep] = useState(null);
  const [error, setError] = useState(null);

  // Feature flag 확인
  const healthKitEnabled = isEnabled('healthkit');

  // 초기화
  useEffect(() => {
    async function init() {
      if (!healthKitEnabled) {
        setIsLoading(false);
        return;
      }

      try {
        const healthPlatform = getHealthPlatform();
        setPlatform(healthPlatform);

        if (healthPlatform === 'web') {
          setIsConnected(false);
          setIsLoading(false);
          return;
        }

        const status = await checkHealthConnection();
        setIsConnected(status.connected);
        setLastSync(status.lastSync);

        if (status.connected) {
          const sleep = await getTodaySleepData();
          setTodaySleep(sleep);
        }
      } catch (e) {
        console.error('[useHealthKit] Init error:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [healthKitEnabled]);

  // 권한 요청 및 연결
  const connect = useCallback(async () => {
    if (!healthKitEnabled) {
      throw new Error('HealthKit이 비활성화되어 있습니다.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await requestHealthPermissions();

      if (!result.granted) {
        throw new Error(result.reason || '권한이 거부되었습니다.');
      }

      // 연결 후 동기화
      await sync();

      setIsConnected(true);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [healthKitEnabled]);

  // 연결 해제
  const disconnect = useCallback(async () => {
    setIsLoading(true);

    try {
      // Phase 2: 실제 연결 해제 구현
      setIsConnected(false);
      setTodaySleep(null);
      setLastSync(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 동기화
  const sync = useCallback(async () => {
    if (!isConnected && platform !== 'web') {
      throw new Error('건강 앱에 먼저 연결해주세요.');
    }

    try {
      const result = await syncHealthData();

      if (result.success) {
        setLastSync(result.syncedAt);

        // 오늘 수면 데이터 갱신
        const sleep = await getTodaySleepData();
        setTodaySleep(sleep);
      }

      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [isConnected, platform]);

  // 기간별 수면 데이터 조회
  const fetchSleepData = useCallback(async (startDate, endDate) => {
    if (!isConnected) {
      return [];
    }

    return getSleepData(startDate, endDate);
  }, [isConnected]);

  return {
    // 상태
    isConnected,
    isLoading,
    platform,
    lastSync,
    todaySleep,
    error,
    healthKitEnabled,

    // 액션
    connect,
    disconnect,
    sync,
    fetchSleepData,

    // 헬퍼
    isSupported: platform !== 'web',
    platformLabel: platform === 'healthkit' ? 'Apple 건강' :
                   platform === 'health-connect' ? 'Google Health Connect' : null,
  };
}

export default useHealthKit;
