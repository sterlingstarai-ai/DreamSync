/**
 * Mixpanel Analytics Adapter (Phase 2+)
 *
 * 환경변수: VITE_MIXPANEL_TOKEN
 *
 * ⚠️ 중요: 민감 데이터 전송 금지
 * - 꿈 원문 ❌
 * - 감정 세부 내용 ❌
 * - 건강 데이터 ❌
 * - 길이/해시만 허용 ✅
 */

import logger from '../../utils/logger';

let mixpanel = null;
let isInitialized = false;

/**
 * Mixpanel 초기화
 */
async function initialize() {
  if (isInitialized) return;

  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token) {
    logger.warn('[Mixpanel] Token not configured');
    return;
  }

  try {
    // Dynamic import to reduce bundle size when not used
    const mp = await import('mixpanel-browser');
    mixpanel = mp.default;
    mixpanel.init(token, {
      debug: import.meta.env.DEV,
      track_pageview: false,
      persistence: 'localStorage',
    });
    isInitialized = true;
    logger.log('[Mixpanel] Initialized');
  } catch (error) {
    logger.error('[Mixpanel] Init failed:', error);
  }
}

/**
 * 사용자 식별
 */
function identify(userId, traits = {}) {
  if (!isInitialized || !mixpanel) return;

  mixpanel.identify(userId);

  // 민감하지 않은 traits만 설정
  const safeTraits = {
    $created: traits.createdAt,
    platform: traits.platform,
    app_version: traits.appVersion,
  };

  mixpanel.people.set(safeTraits);
}

/**
 * 이벤트 추적 (민감 데이터 필터링)
 */
function track(eventName, properties = {}) {
  if (!isInitialized || !mixpanel) {
    logger.log(`[Mixpanel Mock] ${eventName}`, properties);
    return;
  }

  // 민감 데이터 필터링
  const safeProperties = sanitizeProperties(properties);

  mixpanel.track(eventName, {
    ...safeProperties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 민감 데이터 제거/변환
 */
function sanitizeProperties(properties) {
  const safe = {};

  for (const [key, value] of Object.entries(properties)) {
    // 민감 필드 목록
    const sensitiveFields = [
      'content', 'dreamContent', 'dream', 'text',
      'emotions', 'emotionDetails', 'feelings',
      'healthData', 'sleepData', 'hrvData',
      'personalMeaning', 'interpretation',
    ];

    if (sensitiveFields.includes(key)) {
      // 길이만 전송
      if (typeof value === 'string') {
        safe[`${key}_length`] = value.length;
      } else if (Array.isArray(value)) {
        safe[`${key}_count`] = value.length;
      }
    } else if (typeof value === 'object' && value !== null) {
      // 객체는 재귀적으로 처리
      safe[key] = sanitizeProperties(value);
    } else {
      // 안전한 값은 그대로 전송
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * 페이지 뷰 추적
 */
function trackPageView(pageName) {
  track('Page View', { page: pageName });
}

/**
 * 사용자 속성 설정
 */
function setUserProperty(key, value) {
  if (!isInitialized || !mixpanel) return;

  // 민감 데이터 체크
  const sensitiveKeys = ['dreamCount', 'emotionHistory', 'healthScore'];
  if (sensitiveKeys.includes(key)) {
    logger.warn(`[Mixpanel] Blocked sensitive property: ${key}`);
    return;
  }

  mixpanel.people.set({ [key]: value });
}

/**
 * 사용자 속성 증가
 */
function incrementUserProperty(key, amount = 1) {
  if (!isInitialized || !mixpanel) return;
  mixpanel.people.increment(key, amount);
}

/**
 * 세션 리셋
 */
function reset() {
  if (!isInitialized || !mixpanel) return;
  mixpanel.reset();
}

export const MixpanelAnalyticsAdapter = {
  name: 'mixpanel',
  initialize,
  identify,
  track,
  trackPageView,
  setUserProperty,
  incrementUserProperty,
  reset,
};

export default MixpanelAnalyticsAdapter;
