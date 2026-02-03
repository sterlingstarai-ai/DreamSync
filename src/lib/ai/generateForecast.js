/**
 * 예보 생성 함수
 */
import { generateForecast as generateWithAI } from './service';
import { logError } from '../utils/error';

/**
 * 오늘의 예보 생성
 * @param {Object} params
 * @param {Array} params.recentDreams - 최근 꿈들 (최대 7일)
 * @param {Array} params.recentLogs - 최근 체크인 로그들 (최대 7일)
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
 */
export async function createForecast({ recentDreams = [], recentLogs = [] }) {
  try {
    const forecast = await generateWithAI({ recentDreams, recentLogs });
    return {
      success: true,
      data: forecast,
    };
  } catch (error) {
    logError(error, {
      context: 'createForecast',
      dreamsCount: recentDreams.length,
      logsCount: recentLogs.length,
    });
    return {
      success: false,
      error: error.message || '예보 생성 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 컨디션 숫자를 텍스트로 변환
 * @param {number} condition - 1-5
 * @returns {string}
 */
export function getConditionLabel(condition) {
  const labels = {
    5: '최상',
    4: '좋음',
    3: '보통',
    2: '저조',
    1: '주의',
  };
  return labels[condition] || '보통';
}

/**
 * 컨디션에 맞는 색상 반환
 * @param {number} condition - 1-5
 * @returns {string}
 */
export function getConditionColor(condition) {
  const colors = {
    5: '#10b981', // 초록
    4: '#3b82f6', // 파랑
    3: '#f59e0b', // 주황
    2: '#f97316', // 진한 주황
    1: '#ef4444', // 빨강
  };
  return colors[condition] || '#9ca3af';
}

/**
 * 신뢰도를 텍스트로 변환
 * @param {number} confidence - 0-100
 * @returns {string}
 */
export function getConfidenceLabel(confidence) {
  if (confidence >= 80) return '높음';
  if (confidence >= 60) return '보통';
  if (confidence >= 40) return '낮음';
  return '매우 낮음';
}

/**
 * 신뢰도에 따른 안내 메시지
 * @param {number} confidence
 * @returns {string}
 */
export function getConfidenceNote(confidence) {
  if (confidence >= 70) {
    return '최근 데이터를 바탕으로 한 예측입니다.';
  }
  if (confidence >= 50) {
    return '더 많은 데이터가 쌓이면 정확도가 높아집니다.';
  }
  return '아직 데이터가 부족해 참고용으로만 활용하세요.';
}
