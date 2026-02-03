/**
 * AI 서비스 추상화 레이어
 * Mock ↔ Real AI 전환 가능한 구조
 */
import { generateMockDreamAnalysis, generateMockForecast, generateMockPatternInsights } from './mock';
import { DreamAnalysisSchema, ForecastPredictionSchema, PatternInsightSchema, safeParse } from './schemas';
import { AppError, ERROR_CODES, withRetry } from '../utils/error';

/**
 * AI 서비스 설정
 */
const config = {
  useMock: true, // 1단계에서는 항상 true
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
    let result;

    if (config.useMock) {
      result = await generateMockDreamAnalysis(content);
    } else {
      // TODO: 실제 AI API 호출 (2단계)
      // result = await callClaudeAPI(content);
      throw new AppError('실제 AI 서비스가 아직 연결되지 않았습니다.', ERROR_CODES.AI_UNAVAILABLE);
    }

    // Zod 스키마 검증
    const validation = safeParse(DreamAnalysisSchema, result);
    if (!validation.success) {
      console.error('AI 응답 검증 실패:', validation.error);
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
    let result;

    if (config.useMock) {
      result = await generateMockForecast({ recentDreams, recentLogs });
    } else {
      // TODO: 실제 AI API 호출 (2단계)
      throw new AppError('실제 AI 서비스가 아직 연결되지 않았습니다.', ERROR_CODES.AI_UNAVAILABLE);
    }

    // Zod 스키마 검증
    const validation = safeParse(ForecastPredictionSchema, result);
    if (!validation.success) {
      console.error('예보 응답 검증 실패:', validation.error);
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
 * @returns {Promise<Array>}
 */
export async function generatePatternInsights({ dreams = [], logs = [] }) {
  const generate = async () => {
    let results;

    if (config.useMock) {
      results = await generateMockPatternInsights({ dreams, logs });
    } else {
      // TODO: 실제 AI API 호출 (2단계)
      throw new AppError('실제 AI 서비스가 아직 연결되지 않았습니다.', ERROR_CODES.AI_UNAVAILABLE);
    }

    // 각 인사이트 검증
    const validatedResults = [];
    for (const insight of results) {
      const validation = safeParse(PatternInsightSchema, insight);
      if (validation.success) {
        validatedResults.push(validation.data);
      }
    }

    return validatedResults;
  };

  return withRetry(generate, config.maxRetries, config.retryDelay);
}

/**
 * AI 서비스 상태 확인
 * @returns {Object}
 */
export function getAIServiceStatus() {
  return {
    useMock: config.useMock,
    available: true, // Mock은 항상 사용 가능
  };
}
