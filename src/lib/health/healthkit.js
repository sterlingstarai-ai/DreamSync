/**
 * HealthKit / Health Connect 연동 모듈
 *
 * Phase 2에서 실제 구현
 * 현재는 Mock 버전
 */

import { Capacitor } from '@capacitor/core';
import logger from '../utils/logger';

/**
 * 플랫폼 확인
 */
export function getHealthPlatform() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'healthkit';
  if (platform === 'android') return 'health-connect';
  return 'web';
}

/**
 * 건강 데이터 권한 요청 (Mock)
 */
export async function requestHealthPermissions() {
  const platform = getHealthPlatform();

  if (platform === 'web') {
    logger.log('[Health] Web에서는 건강 데이터를 사용할 수 없습니다.');
    return { granted: false, reason: 'web-not-supported' };
  }

  // Phase 2: 실제 권한 요청 구현
  // iOS: @niclandry/capacitor-healthkit-plugin
  // Android: @niclandry/capacitor-health-connect-plugin

  logger.log(`[Health] ${platform} 권한 요청 (Mock)`);

  // Mock: 권한 승인됨으로 가정
  return { granted: true, platform };
}

/**
 * 수면 데이터 조회 (Mock)
 *
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object[]>}
 */
export async function getSleepData(startDate, endDate) {
  const platform = getHealthPlatform();

  if (platform === 'web') {
    return [];
  }

  // Phase 2: 실제 데이터 조회 구현
  logger.log(`[Health] 수면 데이터 조회 (Mock): ${startDate} ~ ${endDate}`);

  // Mock 데이터 생성
  const mockData = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    mockData.push({
      date: new Date(current),
      duration: 420 + Math.floor(Math.random() * 60), // 7-8시간
      bedTime: '23:00',
      wakeTime: '07:00',
      remPercent: 18 + Math.floor(Math.random() * 10), // 18-28%
      deepPercent: 13 + Math.floor(Math.random() * 10), // 13-23%
      lightPercent: 50 + Math.floor(Math.random() * 10),
      awakePercent: 2 + Math.floor(Math.random() * 5),
      hrv: 30 + Math.floor(Math.random() * 30), // 30-60
      heartRate: {
        min: 50 + Math.floor(Math.random() * 10),
        max: 70 + Math.floor(Math.random() * 20),
        avg: 55 + Math.floor(Math.random() * 10),
      },
      source: 'mock',
    });

    current.setDate(current.getDate() + 1);
  }

  return mockData;
}

/**
 * 오늘의 수면 데이터 조회
 */
export async function getTodaySleepData() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const data = await getSleepData(yesterday, today);
  return data[0] || null;
}

/**
 * 건강 연동 상태 확인
 */
export async function checkHealthConnection() {
  const platform = getHealthPlatform();

  if (platform === 'web') {
    return { connected: false, reason: 'web-not-supported' };
  }

  // Phase 2: 실제 연결 상태 확인
  // 현재는 Mock으로 연결됨 반환

  return {
    connected: true,
    platform,
    lastSync: new Date(),
    permissions: ['sleep', 'heartRate', 'hrv'],
  };
}

/**
 * 건강 데이터 동기화
 */
export async function syncHealthData() {
  const platform = getHealthPlatform();

  if (platform === 'web') {
    return { success: false, reason: 'web-not-supported' };
  }

  logger.log(`[Health] 데이터 동기화 (Mock)`);

  // Mock: 지난 7일 데이터 동기화
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const sleepData = await getSleepData(startDate, endDate);

  return {
    success: true,
    syncedAt: new Date(),
    recordCount: sleepData.length,
  };
}

export default {
  getHealthPlatform,
  requestHealthPermissions,
  getSleepData,
  getTodaySleepData,
  checkHealthConnection,
  syncHealthData,
};
