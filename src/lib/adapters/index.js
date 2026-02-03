/**
 * Adapters Export
 *
 * 어댑터 패턴으로 구현된 서비스들
 * 환경변수나 Feature Flag로 런타임에 전환 가능
 */

import logger from '../utils/logger';

// Storage Adapter
export { default as storage, zustandStorage } from './storage';

// AI Adapter
import { setAIAdapter as _setAI, getAIAdapter, getAIAdapterName } from './ai';
export { _setAI as setAIAdapter, getAIAdapter, getAIAdapterName };

// Analytics Adapter
import analyticsDefault, { setAnalyticsAdapter as _setAnalytics } from './analytics';
export { analyticsDefault as analytics, _setAnalytics as setAnalyticsAdapter };

// API Adapter
import { setAPIAdapter as _setAPI, getAPIAdapter } from './api';
export { _setAPI as setAPIAdapter, getAPIAdapter };

/**
 * 모든 어댑터 초기화
 * 앱 시작 시 호출
 *
 * @param {Object} [config]
 * @param {'mock'|'edge'} [config.ai]
 * @param {'mock'|'mixpanel'} [config.analytics]
 * @param {'local'|'supabase'} [config.api]
 */
export function initializeAdapters(config = {}) {
  const { ai = 'mock', analytics = 'mock', api = 'local' } = /** @type {any} */ (config);

  _setAI(ai);
  _setAnalytics(analytics);
  _setAPI(api);

  logger.log('[Adapters] Initialized:', { ai, analytics, api });
}
