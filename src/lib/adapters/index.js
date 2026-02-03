/**
 * Adapters Export
 *
 * 어댑터 패턴으로 구현된 서비스들
 * 환경변수나 Feature Flag로 런타임에 전환 가능
 */

// Storage Adapter
export { default as storage, zustandStorage } from './storage';

// AI Adapter
export { setAIAdapter, getAIAdapter, getAIAdapterName } from './ai';

// Analytics Adapter
export { default as analytics, setAnalyticsAdapter } from './analytics';

// API Adapter
export { setAPIAdapter, getAPIAdapter } from './api';

/**
 * 모든 어댑터 초기화
 * 앱 시작 시 호출
 *
 * @param {Object} config
 * @param {string} config.ai - 'mock' | 'claude'
 * @param {string} config.analytics - 'mock' | 'mixpanel'
 * @param {string} config.api - 'local' | 'supabase'
 */
export function initializeAdapters(config = {}) {
  const { ai = 'mock', analytics = 'mock', api = 'local' } = config;

  // AI Adapter
  const { setAIAdapter } = require('./ai');
  setAIAdapter(ai);

  // Analytics Adapter
  const { setAnalyticsAdapter } = require('./analytics');
  setAnalyticsAdapter(analytics);

  // API Adapter
  const { setAPIAdapter } = require('./api');
  setAPIAdapter(api);

  console.log('[Adapters] Initialized:', { ai, analytics, api });
}
