/**
 * Analytics Adapter Interface
 * Mock Analytics ↔ Real Analytics (Mixpanel) 전환 가능한 구조
 *
 * 어댑터 패턴:
 * - MockAnalyticsAdapter: 개발용 (콘솔 로깅)
 * - MixpanelAdapter: 실제 분석 (Phase 2+)
 */
import logger from '../utils/logger';

/**
 * Analytics Adapter 인터페이스
 * @typedef {Object} AnalyticsAdapter
 * @property {function(string): void} identify
 * @property {function(string, Object?): void} track
 * @property {function(Object): void} setUserProperties
 * @property {function(): void} reset
 */

/**
 * Mock Analytics Adapter (개발용)
 */
const MockAnalyticsAdapter = {
  name: 'mock',

  identify(userId) {
    logger.log('[Analytics] Identify:', userId);
  },

  track(event, properties = {}) {
    logger.log('[Analytics] Track:', event, properties);
  },

  setUserProperties(properties) {
    logger.log('[Analytics] User Properties:', properties);
  },

  reset() {
    logger.log('[Analytics] Reset');
  },
};

/**
 * Mixpanel Adapter (Phase 2+)
 */
const MixpanelAdapter = {
  name: 'mixpanel',

  identify(userId) {
    // TODO: Phase 2에서 구현
    // mixpanel.identify(userId);
    logger.log('[Mixpanel] Identify:', userId);
  },

  track(event, properties = {}) {
    // TODO: Phase 2에서 구현
    // mixpanel.track(event, properties);
    logger.log('[Mixpanel] Track:', event, properties);
  },

  setUserProperties(properties) {
    // TODO: Phase 2에서 구현
    // mixpanel.people.set(properties);
    logger.log('[Mixpanel] User Properties:', properties);
  },

  reset() {
    // TODO: Phase 2에서 구현
    // mixpanel.reset();
    logger.log('[Mixpanel] Reset');
  },
};

/**
 * Analytics Adapter 레지스트리
 */
const adapters = {
  mock: MockAnalyticsAdapter,
  mixpanel: MixpanelAdapter,
};

/**
 * 현재 활성 어댑터
 */
let currentAdapter = MockAnalyticsAdapter;

/**
 * Analytics Adapter 설정
 * @param {'mock' | 'mixpanel'} type
 */
export function setAnalyticsAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    logger.warn(`Unknown analytics adapter: ${type}, falling back to mock`);
    currentAdapter = MockAnalyticsAdapter;
  } else {
    currentAdapter = adapter;
  }
}

/**
 * 분석 이벤트 트래킹 헬퍼
 */
export const analytics = {
  // 사용자 식별
  identify: (userId) => currentAdapter.identify(userId),

  // 이벤트 트래킹
  track: (event, properties) => currentAdapter.track(event, properties),

  // 사용자 속성 설정
  setUserProperties: (properties) => currentAdapter.setUserProperties(properties),

  // 초기화 (로그아웃 시)
  reset: () => currentAdapter.reset(),

  // 사전 정의 이벤트
  events: {
    // 인증
    SIGN_UP: 'sign_up',
    SIGN_IN: 'sign_in',
    SIGN_OUT: 'sign_out',

    // 꿈 기록
    DREAM_CREATED: 'dream_created',
    DREAM_ANALYZED: 'dream_analyzed',
    VOICE_INPUT_USED: 'voice_input_used',

    // 체크인
    CHECK_IN_COMPLETED: 'check_in_completed',
    CHECK_IN_SKIPPED: 'check_in_skipped',

    // 예보
    FORECAST_VIEWED: 'forecast_viewed',
    FORECAST_ACCURACY_RECORDED: 'forecast_accuracy_recorded',

    // 기타
    SYMBOL_VIEWED: 'symbol_viewed',
    REPORT_VIEWED: 'report_viewed',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    NOTIFICATION_ENABLED: 'notification_enabled',
    FEATURE_FLAG_TOGGLED: 'feature_flag_toggled',
  },
};

export default analytics;
