/**
 * Android Health Connect Provider
 *
 * Capacitor 8 + capacitor-health-extended 플러그인 사용.
 * Health Connect가 설치되어 있어야 동작. 미설치 시 안내.
 *
 * @type {import('./IWearableProvider').IWearableProvider}
 */
import { Capacitor } from '@capacitor/core';
import logger from '../utils/logger';
import { estimateSleepQuality } from './schemas';

let connected = false;
let lastSyncTime = null;

/**
 * Health Connect 플러그인 동적 import
 * @returns {Promise<any|null>}
 */
async function getHealthPlugin() {
  if (Capacitor.getPlatform() !== 'android') return null;

  try {
    // Phase 2: capacitor-health-extended 설치 후 활성화
    // const { CapacitorHealthExtended } = await import('capacitor-health-extended');
    // return CapacitorHealthExtended;
    logger.log('[HealthConnect] 플러그인 미설치 — Mock fallback');
    return null;
  } catch {
    logger.log('[HealthConnect] 플러그인 로드 실패');
    return null;
  }
}

/**
 * Health Connect 원시 수면 데이터를 WearableSleepSummary로 변환
 *
 * @param {Object} raw - 플러그인 반환 원시 데이터
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
    source: 'healthconnect',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @type {import('./IWearableProvider').IWearableProvider}
 */
const HealthConnectProvider = {
  name: 'healthconnect',

  async getStatus() {
    if (Capacitor.getPlatform() !== 'android') {
      return {
        connected: false,
        platform: 'healthconnect',
        lastSync: null,
        permissions: [],
        error: 'Android에서만 사용 가능합니다.',
      };
    }

    const plugin = await getHealthPlugin();
    if (!plugin) {
      return {
        connected,
        platform: 'healthconnect',
        lastSync: lastSyncTime,
        permissions: connected ? ['sleep'] : [],
        error: connected ? null : 'Health Connect가 설치되지 않았습니다.',
      };
    }

    // Phase 2: 실제 상태 조회
    // const available = await plugin.isHealthConnectAvailable();
    return {
      connected,
      platform: 'healthconnect',
      lastSync: lastSyncTime,
      permissions: connected ? ['sleep', 'heartRate', 'hrv'] : [],
      error: null,
    };
  },

  async requestPermissions() {
    if (Capacitor.getPlatform() !== 'android') {
      return { granted: false, reason: 'android-only' };
    }

    const plugin = await getHealthPlugin();
    if (!plugin) {
      // 플러그인 없으면 개발 모드 연결
      logger.log('[HealthConnect] 플러그인 없음 — 개발 모드 연결');
      connected = true;
      return { granted: true };
    }

    try {
      // Phase 2: 실제 권한 요청
      // const result = await plugin.requestPermissions({
      //   permissions: ['READ_SLEEP', 'READ_HEART_RATE'],
      // });
      connected = true;
      return { granted: true };
    } catch (e) {
      logger.error('[HealthConnect] 권한 요청 실패:', e);
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
      logger.error('[HealthConnect] 수면 데이터 조회 실패:', e);
      return [];
    }
  },

  async getSleepSummary(date) {
    const summaries = await this.getSleepSummaries(date, date);
    return summaries[0] ?? null;
  },
};

export { transformSleepData };

export default HealthConnectProvider;
