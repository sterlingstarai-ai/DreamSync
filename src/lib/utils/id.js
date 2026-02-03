/**
 * ID 생성 유틸리티
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * UUID v4 생성
 * @returns {string}
 */
export function generateId() {
  return uuidv4();
}

/**
 * 짧은 ID 생성 (표시용)
 * @param {number} length - 기본 8자
 * @returns {string}
 */
export function generateShortId(length = 8) {
  return uuidv4().replace(/-/g, '').substring(0, length);
}

/**
 * 타임스탬프 기반 ID 생성
 * @param {string} prefix - 접두사 (예: 'dream', 'log')
 * @returns {string}
 */
export function generateTimestampId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
