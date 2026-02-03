/**
 * AI 서비스 추상화 레이어
 *
 * 단일 진입점: 모든 AI 호출은 이 서비스를 통해 수행
 * 어댑터를 통해 mock/edge 구현체를 교체
 */
import { getAIAdapter } from '../adapters/ai';
import { DreamAnalysisSchema, ForecastPredictionSchema, safeParse } from './schemas';
import { AppError, ERROR_CODES, withRetry } from '../utils/error';
import logger from '../utils/logger';

/**
 * AI 서비스 설정
 */
const config = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * AI 서비스 설정 변경
 * @param {Object} newConfig
 */
export function configureAI(newConfig) {
  Object.assign(config, newConfig);
}

/**
 * 꿈 분석 요청
 * @param {string} content - 꿈 내용
 * @returns {Promise<Object>}
 */
export async function analyzeDream(content) {
  if (!content || content.trim().length < 10) {
    throw new AppError('꿈 내용이 너무 짧습니다.', ERROR_CODES.VALIDATION_ERROR);
  }

  const analyze = async () => {
    const adapter = getAIAdapter();
    const result = await adapter.analyzeDream(content);

    // Zod 스키마 검증
    const validation = safeParse(DreamAnalysisSchema, result);
    if (!validation.success) {
      logger.error('AI 응답 검증 실패:', validation.error);
      throw new AppError('AI 응답 형식이 올바르지 않습니다.', ERROR_CODES.AI_PARSE_ERROR);
    }

    return validation.data;
  };

  return withRetry(analyze, config.maxRetries, config.retryDelay);
}

/**
 * 예보 생성 요청
 * @param {Object} params
 * @param {Array} params.recentDreams - 최근 꿈들
 * @param {Array} params.recentLogs - 최근 체크인 로그들
 * @returns {Promise<Object>}
 */
export async function generateForecast({ recentDreams = [], recentLogs = [] }) {
  const generate = async () => {
    const adapter = getAIAdapter();
    const result = await adapter.generateForecast({ recentDreams, recentLogs });

    // Zod 스키마 검증
    const validation = safeParse(ForecastPredictionSchema, result);
    if (!validation.success) {
      logger.error('예보 응답 검증 실패:', validation.error);
      throw new AppError('예보 응답 형식이 올바르지 않습니다.', ERROR_CODES.AI_PARSE_ERROR);
    }

    return validation.data;
  };

  return withRetry(generate, config.maxRetries, config.retryDelay);
}

/**
 * 주간 패턴 인사이트 생성
 * @param {Object} params
 * @param {Array} params.dreams
 * @param {Array} params.logs
 * @returns {Promise<Object>}
 */
export async function generatePatternInsights({ dreams = [], logs = [] }) {
  const generate = async () => {
    const adapter = getAIAdapter();
    return await adapter.generatePatternInsights({ dreams, logs });
  };

  return withRetry(generate, config.maxRetries, config.retryDelay);
}

/**
 * AI 서비스 상태 확인
 * @returns {Object}
 */
export function getAIServiceStatus() {
  const adapter = getAIAdapter();
  return {
    adapterName: adapter.name,
    available: true,
  };
}
