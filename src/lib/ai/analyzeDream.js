/**
 * 꿈 분석 함수
 */
import { analyzeDream as analyzeWithAI } from './service';
import { logError } from '../utils/error';

/**
 * 꿈 내용을 분석하고 결과 반환
 * @param {string} content - 꿈 내용
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
 */
export async function analyzeDream(content) {
  try {
    const analysis = await analyzeWithAI(content);
    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    logError(error, { context: 'analyzeDream', contentLength: content?.length });
    return {
      success: false,
      error: error.message || '꿈 분석 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 꿈 분석 결과에서 주요 심볼 추출
 * @param {Object} analysis
 * @returns {Array}
 */
export function getMainSymbols(analysis) {
  if (!analysis?.symbols) return [];
  return analysis.symbols.slice(0, 3);
}

/**
 * 꿈 분석 결과에서 주요 감정 추출
 * @param {Object} analysis
 * @returns {Array}
 */
export function getMainEmotions(analysis) {
  if (!analysis?.emotions) return [];
  return analysis.emotions.slice(0, 2);
}

/**
 * 분석 강도를 텍스트로 변환
 * @param {number} intensity - 1-10
 * @returns {string}
 */
export function getIntensityLabel(intensity) {
  if (intensity >= 8) return '매우 강함';
  if (intensity >= 6) return '강함';
  if (intensity >= 4) return '보통';
  if (intensity >= 2) return '약함';
  return '매우 약함';
}
