/**
 * Sentry Error Tracking Adapter (Phase 2+)
 *
 * 환경변수: VITE_SENTRY_DSN
 *
 * ⚠️ 중요: 민감 데이터 전송 금지
 * - 꿈 원문 ❌
 * - 감정 세부 내용 ❌
 * - 건강 데이터 ❌
 * - 에러 컨텍스트만 허용 ✅
 */

import logger from '../../utils/logger';

let Sentry = null;
let isInitialized = false;

/**
 * Sentry 초기화
 */
async function initialize() {
  if (isInitialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    logger.warn('[Sentry] DSN not configured');
    return;
  }

  try {
    // Dynamic import
    Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      beforeSend(event) {
        // 민감 데이터 필터링
        return sanitizeEvent(event);
      },
      beforeBreadcrumb(breadcrumb) {
        // 민감 breadcrumb 필터링
        return sanitizeBreadcrumb(breadcrumb);
      },
    });
    isInitialized = true;
    logger.log('[Sentry] Initialized');
  } catch (error) {
    logger.error('[Sentry] Init failed:', error);
  }
}

/**
 * 이벤트에서 민감 데이터 제거
 */
function sanitizeEvent(event) {
  if (!event) return event;

  // 민감 필드 패턴 (mask.js SENSITIVE_KEYS와 동기화)
  const sensitivePatterns = [
    /dream/i, /content/i, /emotion/i, /feeling/i,
    /health/i, /sleep/i, /hrv/i, /personal/i,
    /interpret/i, /meaning/i, /\bnote\b/i, /\btext\b/i,
  ];

  // extra 필터링
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      if (sensitivePatterns.some(p => p.test(key))) {
        event.extra[key] = '[REDACTED]';
      }
    }
  }

  // contexts 필터링
  if (event.contexts) {
    for (const [, context] of Object.entries(event.contexts)) {
      if (typeof context === 'object' && context !== null) {
        for (const key of Object.keys(context)) {
          if (sensitivePatterns.some(p => p.test(key))) {
            context[key] = '[REDACTED]';
          }
        }
      }
    }
  }

  return event;
}

/**
 * Breadcrumb에서 민감 데이터 제거
 */
function sanitizeBreadcrumb(breadcrumb) {
  if (!breadcrumb) return breadcrumb;

  const sensitiveCategories = ['dream', 'emotion', 'health'];

  if (sensitiveCategories.includes(breadcrumb.category)) {
    breadcrumb.data = { redacted: true };
  }

  return breadcrumb;
}

/**
 * 사용자 설정
 */
function setUser(user) {
  if (!isInitialized || !Sentry) return;

  Sentry.setUser({
    id: user.id,
    // 이메일, 이름 등 PII 제외
  });
}

/**
 * 에러 캡처 (민감 데이터 제외)
 */
function captureException(error, context = {}) {
  if (!isInitialized || !Sentry) {
    logger.error('[Sentry Mock] Exception:', error);
    return;
  }

  // 컨텍스트에서 민감 데이터 제거
  const safeContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && value.length > 50) {
      safeContext[key] = `[${value.length} chars]`;
    } else if (typeof value === 'object') {
      safeContext[key] = '[object]';
    } else {
      safeContext[key] = value;
    }
  }

  Sentry.captureException(error, { extra: safeContext });
}

/**
 * 메시지 캡처
 */
function captureMessage(message, level = 'info') {
  if (!isInitialized || !Sentry) {
    logger.log(`[Sentry Mock] ${level}: ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Breadcrumb 추가
 */
function addBreadcrumb(breadcrumb) {
  if (!isInitialized || !Sentry) return;

  Sentry.addBreadcrumb(sanitizeBreadcrumb(breadcrumb));
}

/**
 * 태그 설정
 */
function setTag(key, value) {
  if (!isInitialized || !Sentry) return;
  Sentry.setTag(key, value);
}

export const SentryAdapter = {
  name: 'sentry',
  initialize,
  setUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
};

export default SentryAdapter;
