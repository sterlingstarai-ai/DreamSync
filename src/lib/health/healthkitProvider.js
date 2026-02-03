/**
 * iOS HealthKit Provider
 *
 * Capacitor 8 + capacitor-health-extended 플러그인 사용.
 * 실기기에서만 동작. 웹/시뮬레이터에서는 MockProvider로 fallback.
 */
import { Capacitor } from '@capacitor/core';
import logger from '../utils/logger';
import { estimateSleepQuality } from './schemas';

let connected = false;
let lastSyncTime = null;

/**
 * HealthKit 플러그인 동적 import
 * capacitor-health-extended가 설치되어 있을 때만 로드
 *
 * @returns {Promise<any|null>}
 */
async function getHealthPlugin() {
  if (Capacitor.getPlatform() !== 'ios') return null;

  try {
    // Phase 2: capacitor-health-extended 설치 후 활성화
    // const { CapacitorHealthExtended } = await import('capacitor-health-extended');
    // return CapacitorHealthExtended;
    logger.log('[HealthKit] 플러그인 미설치 — Mock fallback');
    return null;
  } catch {
    logger.log('[HealthKit] 플러그인 로드 실패');
    return null;
  }
}

/**
 * HealthKit 원시 수면 데이터를 WearableSleepSummary로 변환
 *
 * @param {Object} raw - 플러그인에서 반환한 원시 데이터
 * @param {string} date - YYYY-MM-DD
 * @returns {import('./schemas').WearableSleepSummary}
 */
function transformSleepData(raw, date) {
  const totalSleepMinutes = raw.totalSleepMinutes ?? raw.duration ?? null;
  const remMinutes = raw.remMinutes ?? null;
  const deepMinutes = raw.deepMinutes ?? null;
  const hrvMs = raw.hrvMs ?? raw.hrv ?? null;

  return {
    date,
    totalSleepMinutes,
    sleepQualityScore: estimateSleepQuality({ totalSleepMinutes, remMinutes, deepMinutes, hrvMs }),
    remMinutes,
    deepMinutes,
    hrvMs,
    bedTime: raw.bedTime ?? null,
    wakeTime: raw.wakeTime ?? null,
    source: 'healthkit',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @type {import('./IWearableProvider').IWearableProvider}
 */
const HealthKitProvider = {
  name: 'healthkit',

  async getStatus() {
    if (Capacitor.getPlatform() !== 'ios') {
      return {
        connected: false,
        platform: 'healthkit',
        lastSync: null,
        permissions: [],
        error: 'iOS에서만 사용 가능합니다.',
      };
    }

    const plugin = await getHealthPlugin();
    if (!plugin) {
      return {
        connected,
        platform: 'healthkit',
        lastSync: lastSyncTime,
        permissions: connected ? ['sleep'] : [],
        error: connected ? null : '플러그인이 설치되지 않았습니다.',
      };
    }

    // Phase 2: 실제 상태 조회
    // const authStatus = await plugin.getAuthorizationStatus({ ... });
    return {
      connected,
      platform: 'healthkit',
      lastSync: lastSyncTime,
      permissions: connected ? ['sleep', 'heartRate', 'hrv'] : [],
      error: null,
    };
  },

  async requestPermissions() {
    if (Capacitor.getPlatform() !== 'ios') {
      return { granted: false, reason: 'ios-only' };
    }

    const plugin = await getHealthPlugin();
    if (!plugin) {
      // 플러그인 없으면 mock 모드로 연결 허용 (개발용)
      logger.log('[HealthKit] 플러그인 없음 — 개발 모드 연결');
      connected = true;
      return { granted: true };
    }

    try {
      // Phase 2: 실제 권한 요청
      // await plugin.requestAuthorization({
      //   read: ['sleep', 'heartRate', 'heartRateVariability'],
      // });
      connected = true;
      return { granted: true };
    } catch (e) {
      logger.error('[HealthKit] 권한 요청 실패:', e);
      return { granted: false, reason: e.message || '권한이 거부되었습니다.' };
    }
  },

  async disconnect() {
    connected = false;
    lastSyncTime = null;
  },

  async getSleepSummaries(_startDate, _endDate) {
    const plugin = await getHealthPlugin();
    if (!plugin) {
      // 플러그인 없으면 빈 배열 (MockProvider가 대신 처리)
      return [];
    }

    try {
      // Phase 2: 실제 데이터 조회
      // const result = await plugin.querySleepSessions({
      //   startDate: _startDate,
      //   endDate: _endDate,
      // });
      // return result.sessions.map(s => transformSleepData(s, s.date));
      lastSyncTime = new Date().toISOString();
      return [];
    } catch (e) {
      logger.error('[HealthKit] 수면 데이터 조회 실패:', e);
      return [];
    }
  },

  async getSleepSummary(date) {
    const summaries = await this.getSleepSummaries(date, date);
    return summaries[0] ?? null;
  },
};

// transformSleepData를 테스트용으로 export
export { transformSleepData };

export default HealthKitProvider;
