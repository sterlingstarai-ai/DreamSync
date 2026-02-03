/**
 * 에러 처리 유틸리티
 */
import logger from './logger';

/**
 * 앱 에러 클래스
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
  // 인증
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',

  // 데이터
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE: 'DUPLICATE',

  // 네트워크
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // AI
  AI_PARSE_ERROR: 'AI_PARSE_ERROR',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',

  // 권한
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  HEALTHKIT_DENIED: 'HEALTHKIT_DENIED',

  // 저장소
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // 기타
  UNKNOWN: 'UNKNOWN',
};

/**
 * 에러 메시지 (한글)
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_REQUIRED]: '로그인이 필요합니다.',
  [ERROR_CODES.AUTH_INVALID]: '인증 정보가 올바르지 않습니다.',
  [ERROR_CODES.AUTH_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요.',

  [ERROR_CODES.NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.',
  [ERROR_CODES.VALIDATION_ERROR]: '입력 정보를 확인해주세요.',
  [ERROR_CODES.DUPLICATE]: '이미 존재하는 데이터입니다.',

  [ERROR_CODES.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
  [ERROR_CODES.TIMEOUT]: '요청 시간이 초과되었습니다.',
  [ERROR_CODES.SERVER_ERROR]: '서버 오류가 발생했습니다.',

  [ERROR_CODES.AI_PARSE_ERROR]: '분석 결과를 처리하는 중 오류가 발생했습니다.',
  [ERROR_CODES.AI_RATE_LIMIT]: '잠시 후 다시 시도해주세요.',
  [ERROR_CODES.AI_UNAVAILABLE]: 'AI 서비스를 일시적으로 사용할 수 없습니다.',

  [ERROR_CODES.PERMISSION_DENIED]: '권한이 필요합니다.',
  [ERROR_CODES.HEALTHKIT_DENIED]: 'HealthKit 접근 권한이 필요합니다.',

  [ERROR_CODES.STORAGE_FULL]: '저장 공간이 부족합니다.',
  [ERROR_CODES.STORAGE_ERROR]: '데이터 저장 중 오류가 발생했습니다.',

  [ERROR_CODES.UNKNOWN]: '알 수 없는 오류가 발생했습니다.',
};

/**
 * 에러 메시지 가져오기
 * @param {string} code
 * @returns {string}
 */
export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN];
}

/**
 * 에러를 AppError로 변환
 * @param {Error} error
 * @returns {AppError}
 */
export function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  // 네트워크 에러
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return new AppError(
      ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      ERROR_CODES.NETWORK_ERROR,
      error
    );
  }

  // 타임아웃
  if (error.name === 'AbortError') {
    return new AppError(
      ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
      ERROR_CODES.TIMEOUT,
      error
    );
  }

  return new AppError(
    error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN],
    ERROR_CODES.UNKNOWN,
    error
  );
}

/**
 * 에러 로깅 (Sentry 연동 준비)
 * @param {Error} error
 * @param {Object} context
 */
export function logError(error, context = {}) {
  const normalizedError = normalizeError(error);

  // 콘솔 로깅 (개발용)
  logger.error('[AppError]', {
    message: normalizedError.message,
    code: normalizedError.code,
    timestamp: normalizedError.timestamp,
    context,
    details: normalizedError.details,
  });

  // TODO: Sentry 연동 (2단계)
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * 재시도 로직 래퍼
 * @param {Function} fn - 실행할 비동기 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간격 (ms)
 * @returns {Promise}
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}
