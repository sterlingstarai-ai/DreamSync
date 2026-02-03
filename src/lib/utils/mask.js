/**
 * 민감 데이터 마스킹 유틸리티
 * 꿈 원문, 감정 상세 등이 로그/에러 리포터에 노출되지 않도록 처리
 */

/** @type {string[]} */
const SENSITIVE_KEYS = [
  'content', 'dreamContent', 'dream', 'text',
  'emotions', 'emotionDetails', 'feelings',
  'personalMeaning', 'interpretation', 'meaning',
  'note', 'healthData', 'sleepData', 'hrvData',
];

/**
 * 값이 민감 키에 해당하면 길이만 남기고 마스킹
 * @param {string} key
 * @param {any} value
 * @returns {any}
 */
function maskValue(key, value) {
  const lowerKey = key.toLowerCase();
  const isSensitive = SENSITIVE_KEYS.some(k => lowerKey.includes(k.toLowerCase()));

  if (!isSensitive) return value;

  if (typeof value === 'string') {
    return `[${value.length} chars]`;
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === 'object' && value !== null) {
    return '[object]';
  }
  return value;
}

/**
 * 객체에서 민감 필드를 마스킹한 안전한 복사본 반환
 * @param {Record<string, any>} obj
 * @returns {Record<string, any>}
 */
export function maskSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const safe = {};
  for (const [key, value] of Object.entries(obj)) {
    const masked = maskValue(key, value);
    if (masked !== value) {
      safe[key] = masked;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      safe[key] = maskSensitiveFields(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * 꿈 내용을 로깅에 안전한 형태로 변환
 * @param {string} content
 * @returns {string}
 */
export function maskDreamContent(content) {
  if (!content) return '[empty]';
  return `[dream: ${content.length} chars]`;
}
