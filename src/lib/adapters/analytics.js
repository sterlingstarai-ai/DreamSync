/**
 * Analytics Adapter Interface
 * Mock Analytics ↔ Real Analytics (Mixpanel) 전환 가능한 구조
 *
 * 어댑터 패턴:
 * - MockAnalyticsAdapter: 개발용 (콘솔 로깅)
 * - MixpanelAdapter: 실제 분석
 */
import logger from '../utils/logger';
import MixpanelAnalyticsAdapter from './analytics/mixpanel';

/**
 * Analytics Adapter 인터페이스
 * @typedef {Object} AnalyticsAdapter
 * @property {function(): (void|Promise<void>)} [initialize]
 * @property {function(string, Object=): void} identify
 * @property {function(string, Object?): void} track
 * @property {function(Object): void} setUserProperties
 * @property {function(string, any): void} [setUserProperty]
 * @property {function(string, number=): void} [incrementUserProperty]
 * @property {function(): void} reset
 */

/**
 * Mock Analytics Adapter (개발용)
 */
const MockAnalyticsAdapter = {
  name: 'mock',
  initialize() {
    // no-op
  },

  identify(userId, traits = {}) {
    logger.log('[Analytics] Identify:', userId, traits);
  },

  track(event, properties = {}) {
    logger.log('[Analytics] Track:', event, properties);
  },

  setUserProperties(properties) {
    logger.log('[Analytics] User Properties:', properties);
  },

  setUserProperty(key, value) {
    logger.log('[Analytics] User Property:', key, value);
  },

  incrementUserProperty(key, amount = 1) {
    logger.log('[Analytics] Increment User Property:', key, amount);
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
  initialize() {
    void MixpanelAnalyticsAdapter.initialize();
  },

  identify(userId, traits = {}) {
    MixpanelAnalyticsAdapter.identify(userId, traits);
  },

  track(event, properties = {}) {
    MixpanelAnalyticsAdapter.track(event, properties);
  },

  setUserProperties(properties) {
    for (const [key, value] of Object.entries(properties || {})) {
      MixpanelAnalyticsAdapter.setUserProperty(key, value);
    }
  },

  setUserProperty(key, value) {
    MixpanelAnalyticsAdapter.setUserProperty(key, value);
  },

  incrementUserProperty(key, amount = 1) {
    MixpanelAnalyticsAdapter.incrementUserProperty(key, amount);
  },

  reset() {
    MixpanelAnalyticsAdapter.reset();
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

function activateAdapter(adapter, type) {
  currentAdapter = adapter;
  try {
    if (typeof currentAdapter.initialize === 'function') {
      void currentAdapter.initialize();
    }
  } catch (error) {
    logger.error(`[Analytics] Failed to initialize ${type} adapter:`, error);
  }
}

/**
 * Analytics Adapter 설정
 * @param {'mock' | 'mixpanel'} type
 */
export function setAnalyticsAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    logger.warn(`Unknown analytics adapter: ${type}, falling back to mock`);
    activateAdapter(MockAnalyticsAdapter, 'mock');
  } else {
    activateAdapter(adapter, type);
  }
}

/**
 * 분석 이벤트 트래킹 헬퍼
 */
export const analytics = {
  // 사용자 식별
  identify: (userId, traits = {}) => currentAdapter.identify(userId, traits),

  // 이벤트 트래킹
  track: (event, properties) => currentAdapter.track(event, properties),

  // 사용자 속성 설정
  setUserProperties: (properties) => currentAdapter.setUserProperties(properties),

  setUserProperty: (key, value) => {
    if (typeof currentAdapter.setUserProperty === 'function') {
      currentAdapter.setUserProperty(key, value);
      return;
    }
    currentAdapter.setUserProperties({ [key]: value });
  },

  incrementUserProperty: (key, amount = 1) => {
    if (typeof currentAdapter.incrementUserProperty === 'function') {
      currentAdapter.incrementUserProperty(key, amount);
      return;
    }
    logger.log('[Analytics] incrementUserProperty not supported by adapter:', currentAdapter.name);
  },

  // 초기화 (로그아웃 시)
  reset: () => currentAdapter.reset(),

  // 사전 정의 이벤트
  events: {
    APP_OPEN: 'app_open',
    AUTH_SIGNUP: 'auth_signup',
    AUTH_LOGIN: 'auth_login',
    AUTH_LOGOUT: 'auth_logout',
    ONBOARDING_STEP: 'onboarding_step',
    ONBOARDING_COMPLETE: 'onboarding_complete',
    ONBOARDING_SKIP: 'onboarding_skip',
    ONBOARDING_MINI_CHECKIN: 'onboarding_mini_checkin',
    DREAM_CREATE_START: 'dream_create_start',
    DREAM_CREATE_COMPLETE: 'dream_create_complete',
    DREAM_ANALYSIS_COMPLETE: 'dream_analysis_complete',
    CHECKIN_START: 'checkin_start',
    CHECKIN_STEP: 'checkin_step',
    CHECKIN_COMPLETE: 'checkin_complete',
    CHECKIN_ABANDON: 'checkin_abandon',
    FORECAST_VIEW: 'forecast_view',
    FORECAST_FEEDBACK: 'forecast_feedback',
    REPORT_VIEW: 'report_view',
    REPORT_SHARE: 'report_share',
    NOTIFICATION_CLICK: 'notification_click',
    SETTINGS_CHANGE: 'settings_change',

    // Legacy aliases
    SIGN_UP: 'auth_signup',
    SIGN_IN: 'auth_login',
    SIGN_OUT: 'auth_logout',
    DREAM_CREATED: 'dream_create_complete',
    DREAM_ANALYZED: 'dream_analysis_complete',
    CHECK_IN_COMPLETED: 'checkin_complete',
    FORECAST_VIEWED: 'forecast_view',
    FORECAST_ACCURACY_RECORDED: 'forecast_feedback',
    REPORT_VIEWED: 'report_view',
    ONBOARDING_COMPLETED: 'onboarding_complete',
  },
};

export default analytics;
