/**
 * Feature Flags 기본값 및 설정
 * Phase별 기능 활성화 통제
 */

/** @type {Record<string, boolean>} */
export const DEFAULT_FLAGS = {
  healthkit: false,
  saju: false,
  uhs: false,
  b2b: false,
  edgeAI: false,
  devMode: false,
  mockAI: true,
};

export const DEFAULT_FEATURE_FLAGS = {
  // Phase 2: HealthKit 연동
  healthkit: false,

  // Phase 3: 사주 분석 (구현 최소화)
  saju: false,

  // Phase 4: UHS 스코어 표시
  uhs: false,

  // Phase 4: B2B API 접근
  b2b: false,

  // Phase 2: Edge Function AI
  edgeAI: false,

  // 개발/디버그용
  devMode: false,
  mockAI: true, // 1단계에서는 항상 true
};

export const FEATURE_FLAG_INFO = {
  healthkit: {
    name: '웨어러블 연동',
    description: '수면 데이터를 자동으로 수집합니다. (iOS: HealthKit, Android: Health Connect)',
    phase: 2,
    requiresPlatform: null,
  },
  saju: {
    name: '사주 분석',
    description: '사주 기반 추가 인사이트를 제공합니다.',
    phase: 3,
    requiresPlatform: null,
  },
  uhs: {
    name: 'UHS 스코어',
    description: '통합 건강 점수를 대시보드에 표시합니다.',
    phase: 4,
    requiresPlatform: null,
  },
  b2b: {
    name: 'B2B API',
    description: '기업용 API 접근을 활성화합니다.',
    phase: 4,
    requiresPlatform: null,
  },
  edgeAI: {
    name: 'Edge AI',
    description: 'Edge Function을 통한 AI 분석을 사용합니다.',
    phase: 2,
    requiresPlatform: null,
  },
  devMode: {
    name: '개발자 모드',
    description: '디버그 정보와 개발 도구를 표시합니다.',
    phase: 0,
    requiresPlatform: null,
  },
  mockAI: {
    name: 'Mock AI',
    description: '실제 AI 대신 Mock 응답을 사용합니다.',
    phase: 0,
    requiresPlatform: null,
  },
};

/**
 * 특정 플래그가 현재 플랫폼에서 사용 가능한지 확인
 * @param {string} flagKey
 * @param {string} platform - 'ios' | 'android' | 'web'
 * @returns {boolean}
 */
export function isFlagAvailable(flagKey, platform) {
  const info = FEATURE_FLAG_INFO[flagKey];
  if (!info) return false;

  if (info.requiresPlatform && info.requiresPlatform !== platform) {
    return false;
  }

  return true;
}
