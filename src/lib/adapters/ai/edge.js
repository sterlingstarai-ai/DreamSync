/**
 * Edge Function AI Adapter
 * Supabase Edge Function 프록시를 통한 AI 호출
 *
 * 보안 원칙:
 * - 클라이언트에 LLM API Key 0
 * - dream content를 로그에 남기지 않음
 * - rate limit(429)은 fallback 안 함 (서버 정책 존중)
 * - 네트워크 에러 시 mock fallback (횟수 제한)
 */

import { AppError, ERROR_CODES } from '../../utils/error';
import { maskDreamContent } from '../../utils/mask';
import { DreamAnalysisSchema, ForecastPredictionSchema } from '../../ai/schemas';
import { generateMockDreamAnalysis, generateMockForecast } from '../../ai/mock';
import logger from '../../utils/logger';
import storage from '../storage';

// ─── 설정 ──────────────────────────────────────────

const EDGE_URL = import.meta.env.VITE_EDGE_FUNCTION_URL;
const MAX_FALLBACK = 5;
const REQUEST_TIMEOUT_MS = 15_000;

let fallbackCount = 0;

// ─── Auth 토큰 (순환 의존 방지: store import 대신 직접 읽기) ──

async function getAuthToken() {
  try {
    const primary = await storage.get('auth');
    if (primary?.state?.token) return primary.state.token;
    if (primary?.token) return primary.token;

    // 레거시 키 호환
    const legacy = await storage.get('dreamsync-auth');
    return legacy?.state?.token || legacy?.token || null;
  } catch {
    return null;
  }
}

// ─── 핵심 호출 함수 ─────────────────────────────────

/**
 * Edge Function 호출
 * @param {'analyzeDream' | 'generateForecast'} type
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function callEdgeFunction(type, payload) {
  if (!EDGE_URL) {
    throw new AppError(
      'Edge Function URL이 설정되지 않았습니다.',
      ERROR_CODES.AI_UNAVAILABLE,
    );
  }

  const token = await getAuthToken();
  if (!token) {
    throw new AppError('로그인이 필요합니다.', ERROR_CODES.AUTH_REQUIRED);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type, payload }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 429: rate limit — fallback 안 함 (서버 정책 존중)
    if (response.status === 429) {
      throw new AppError(
        '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        ERROR_CODES.AI_RATE_LIMIT,
      );
    }
    if (response.status === 401) {
      throw new AppError('로그인이 필요합니다.', ERROR_CODES.AUTH_REQUIRED);
    }
    if (response.status === 403) {
      throw new AppError('인증 정보가 올바르지 않습니다.', ERROR_CODES.AUTH_INVALID);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new AppError(
        errorBody?.error?.message || `Edge Function error: ${response.status}`,
        errorBody?.error?.code || ERROR_CODES.SERVER_ERROR,
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new AppError(
        result.error?.message || 'Edge Function 응답 실패',
        result.error?.code || ERROR_CODES.AI_UNAVAILABLE,
      );
    }

    // 성공 시 fallback 카운터 리셋
    fallbackCount = 0;
    return result.data;
  } catch (err) {
    clearTimeout(timeoutId);

    // rate limit은 fallback 안 함
    if (err instanceof AppError && [
      ERROR_CODES.AI_RATE_LIMIT,
      ERROR_CODES.AUTH_REQUIRED,
      ERROR_CODES.AUTH_INVALID,
    ].includes(err.code)) {
      throw err;
    }

    // fallback 횟수 초과
    fallbackCount++;
    if (fallbackCount > MAX_FALLBACK) {
      logger.warn('[EdgeAI] Mock fallback 횟수 초과', { fallbackCount });
      throw new AppError(
        'AI 서비스를 일시적으로 사용할 수 없습니다.',
        ERROR_CODES.AI_UNAVAILABLE,
      );
    }

    // mock fallback
    logger.warn('[EdgeAI] Edge 호출 실패, mock fallback', {
      type,
      fallbackCount,
      error: err.message,
    });
    return null; // caller에서 mock으로 대체
  }
}

// ─── Edge AI Adapter ────────────────────────────────

export const EdgeAIAdapter = {
  name: 'edge',

  /**
   * 꿈 분석
   * @param {string} content
   * @returns {Promise<Object>}
   */
  async analyzeDream(content) {
    logger.info('[EdgeAI] analyzeDream 호출', { content: maskDreamContent(content) });

    const result = await callEdgeFunction('analyzeDream', { content });

    if (result === null) {
      // mock fallback
      return generateMockDreamAnalysis(content);
    }

    // 클라이언트 측 스키마 검증
    const validation = DreamAnalysisSchema.safeParse(result);
    if (!validation.success) {
      logger.warn('[EdgeAI] 응답 스키마 불일치, mock fallback', {
        errors: validation.error?.issues?.length,
      });
      fallbackCount++;
      return generateMockDreamAnalysis(content);
    }

    return validation.data;
  },

  /**
   * 예보 생성
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async generateForecast(params) {
    logger.info('[EdgeAI] generateForecast 호출');

    const { recentDreams = [], recentCheckIns = [], avgCondition, avgStress } = params;
    const payload = { recentDreams, recentCheckIns, avgCondition, avgStress };

    const result = await callEdgeFunction('generateForecast', payload);

    if (result === null) {
      // mock fallback
      const logs = recentCheckIns.length > 0
        ? recentCheckIns
        : avgCondition ? [{ condition: avgCondition, stressLevel: avgStress || 3 }] : [];
      return generateMockForecast({ recentDreams, recentLogs: logs });
    }

    const validation = ForecastPredictionSchema.safeParse(result);
    if (!validation.success) {
      logger.warn('[EdgeAI] 예보 스키마 불일치, mock fallback');
      fallbackCount++;
      const logs = recentCheckIns.length > 0
        ? recentCheckIns
        : avgCondition ? [{ condition: avgCondition, stressLevel: avgStress || 3 }] : [];
      return generateMockForecast({ recentDreams, recentLogs: logs });
    }

    return validation.data;
  },

  /**
   * 패턴 인사이트 — Edge 미지원, mock 직접 호출
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async generatePatternInsights(params) {
    // Phase 2 스코프 밖 — mock 직접 사용
    const { generateMockPatternInsights } = await import('../../ai/mock');
    return generateMockPatternInsights(params);
  },
};

/**
 * fallback 카운터 리셋 (테스트용)
 */
export function resetFallbackCount() {
  fallbackCount = 0;
}

/**
 * 현재 fallback 카운터 (테스트용)
 */
export function getFallbackCount() {
  return fallbackCount;
}
