/**
 * Mock Wearable Provider
 *
 * 개발/테스트용. 실기기 없이 전체 플로우를 검증.
 */
import { estimateSleepQuality } from './schemas';

let mockConnected = false;

/**
 * 날짜 문자열에서 결정적 mock 데이터 생성 (테스트 재현성)
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {import('./schemas').WearableSleepSummary}
 */
function generateMockSleepSummary(dateStr) {
  // 날짜 기반 시드로 결정적 값 생성
  const seed = dateStr.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0);
  const pseudo = (offset) => ((seed * 7 + offset * 13) % 100) / 100;

  const totalSleepMinutes = Math.round(360 + pseudo(1) * 180); // 6~9시간
  const remMinutes = Math.round(totalSleepMinutes * (0.18 + pseudo(2) * 0.12)); // 18~30%
  const deepMinutes = Math.round(totalSleepMinutes * (0.13 + pseudo(3) * 0.10)); // 13~23%
  const hrvMs = Math.round(25 + pseudo(4) * 45); // 25~70ms

  const qualityScore = estimateSleepQuality({
    totalSleepMinutes,
    remMinutes,
    deepMinutes,
    hrvMs,
  });

  return {
    date: dateStr,
    totalSleepMinutes,
    sleepQualityScore: qualityScore,
    remMinutes,
    deepMinutes,
    hrvMs,
    bedTime: '23:00',
    wakeTime: `0${6 + Math.floor(pseudo(5) * 2)}:${pseudo(6) > 0.5 ? '30' : '00'}`,
    source: 'healthkit',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @type {import('./IWearableProvider').IWearableProvider}
 */
const MockWearableProvider = {
  name: 'mock',

  async getStatus() {
    return {
      connected: mockConnected,
      platform: 'healthkit',
      lastSync: mockConnected ? new Date().toISOString() : null,
      permissions: mockConnected ? ['sleep', 'heartRate', 'hrv'] : [],
      error: null,
    };
  },

  async requestPermissions() {
    mockConnected = true;
    return { granted: true };
  },

  async disconnect() {
    mockConnected = false;
  },

  async getSleepSummaries(startDate, endDate) {
    const summaries = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      summaries.push(generateMockSleepSummary(dateStr));
      current.setDate(current.getDate() + 1);
    }

    return summaries;
  },

  async getSleepSummary(date) {
    return generateMockSleepSummary(date);
  },
};

/**
 * Mock 상태 리셋 (테스트용)
 */
export function resetMockState() {
  mockConnected = false;
}

export default MockWearableProvider;
