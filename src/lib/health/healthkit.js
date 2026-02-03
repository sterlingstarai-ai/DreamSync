/**
 * Wearable Provider Registry
 *
 * 플랫폼별 provider를 자동 선택하고, 기존 API와 호환되는 facade 제공.
 *
 * Provider 구조:
 * - MockProvider: 개발/테스트용
 * - HealthKitProvider: iOS (Phase 2, capacitor-health-extended)
 * - HealthConnectProvider: Android (Phase 2, capacitor-health-extended)
 *
 * 선택 로직:
 * - 네이티브 플러그인이 실제로 동작하면 → 네이티브 provider
 * - 플러그인 미설치/웹 → MockProvider fallback
 */

import { Capacitor } from '@capacitor/core';
import logger from '../utils/logger';
import MockWearableProvider from './mockProvider';
import HealthKitProvider from './healthkitProvider';
import HealthConnectProvider from './healthConnectProvider';

/** @type {import('./IWearableProvider').IWearableProvider} */
let activeProvider = MockWearableProvider;

/**
 * 플랫폼 확인
 * @returns {'healthkit' | 'health-connect' | 'web'}
 */
export function getHealthPlatform() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'healthkit';
  if (platform === 'android') return 'health-connect';
  return 'web';
}

/**
 * 현재 플랫폼에 맞는 provider 선택
 * 네이티브 플러그인 없으면 Mock fallback
 *
 * @returns {import('./IWearableProvider').IWearableProvider}
 */
export function getWearableProvider() {
  return activeProvider;
}

/**
 * Provider 초기화 (앱 부팅 시 1회 호출)
 */
export function initWearableProvider() {
  const platform = getHealthPlatform();

  if (platform === 'healthkit') {
    activeProvider = HealthKitProvider;
    logger.log('[Wearable] HealthKit provider 선택');
  } else if (platform === 'health-connect') {
    activeProvider = HealthConnectProvider;
    logger.log('[Wearable] Health Connect provider 선택');
  } else {
    activeProvider = MockWearableProvider;
    logger.log('[Wearable] Mock provider 선택 (웹 환경)');
  }

  return activeProvider;
}

/**
 * Provider를 수동으로 설정 (테스트용)
 * @param {import('./IWearableProvider').IWearableProvider} provider
 */
export function setWearableProvider(provider) {
  activeProvider = provider;
}

// ─── 기존 API 호환 facade ───────────────────────────────────

/**
 * 건강 데이터 권한 요청
 * @returns {Promise<{ granted: boolean, reason?: string, platform?: string }>}
 */
export async function requestHealthPermissions() {
  const result = await activeProvider.requestPermissions();
  return { ...result, platform: getHealthPlatform() };
}

/**
 * 수면 데이터 조회 (WearableSleepSummary[] 반환)
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {Promise<import('./schemas').WearableSleepSummary[]>}
 */
export async function getSleepData(startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
  return activeProvider.getSleepSummaries(start, end);
}

/**
 * 오늘의 수면 데이터 조회
 * @returns {Promise<import('./schemas').WearableSleepSummary | null>}
 */
export async function getTodaySleepData() {
  const today = new Date().toISOString().split('T')[0];
  return activeProvider.getSleepSummary(today);
}

/**
 * 건강 연동 상태 확인
 * @returns {Promise<import('./schemas').WearableStatus>}
 */
export async function checkHealthConnection() {
  return activeProvider.getStatus();
}

/**
 * 건강 데이터 동기화 (최근 7일)
 * @returns {Promise<{ success: boolean, syncedAt?: Date, recordCount?: number, reason?: string }>}
 */
export async function syncHealthData() {
  const platform = getHealthPlatform();
  if (platform === 'web') {
    return { success: false, reason: 'web-not-supported' };
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString().split('T')[0];

  const sleepData = await activeProvider.getSleepSummaries(startStr, endDate);

  return {
    success: true,
    syncedAt: new Date(),
    recordCount: sleepData.length,
  };
}

export default {
  getHealthPlatform,
  getWearableProvider,
  initWearableProvider,
  setWearableProvider,
  requestHealthPermissions,
  getSleepData,
  getTodaySleepData,
  checkHealthConnection,
  syncHealthData,
};
