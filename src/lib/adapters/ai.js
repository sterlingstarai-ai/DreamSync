/**
 * AI Adapter Interface
 * Mock AI ↔ Real AI (Claude API) 전환 가능한 구조
 *
 * 어댑터 패턴:
 * - MockAIAdapter: 개발/테스트용 (Phase 1)
 * - ClaudeAIAdapter: 실제 AI 연동 (Phase 2+)
 */

import { generateMockDreamAnalysis, generateMockForecast, generateMockPatternInsights } from '../ai/mock';
import { DreamAnalysisSchema, ForecastPredictionSchema, safeParse } from '../ai/schemas';

/**
 * AI Adapter 인터페이스
 * @typedef {Object} AIAdapter
 * @property {function(string): Promise<Object>} analyzeDream
 * @property {function(Object): Promise<Object>} generateForecast
 * @property {function(Object): Promise<Array>} generatePatternInsights
 */

/**
 * Mock AI Adapter (Phase 1)
 */
const MockAIAdapter = {
  name: 'mock',

  async analyzeDream(content) {
    const result = await generateMockDreamAnalysis(content);
    const validation = safeParse(DreamAnalysisSchema, result);
    if (!validation.success) {
      throw new Error('Mock AI 응답 검증 실패');
    }
    return validation.data;
  },

  async generateForecast({ recentDreams, recentLogs }) {
    const result = await generateMockForecast({ recentDreams, recentLogs });
    const validation = safeParse(ForecastPredictionSchema, result);
    if (!validation.success) {
      throw new Error('Mock 예보 응답 검증 실패');
    }
    return validation.data;
  },

  async generatePatternInsights({ dreams, logs }) {
    return await generateMockPatternInsights({ dreams, logs });
  },
};

/**
 * Claude AI Adapter (Phase 2+)
 * Supabase Edge Function 또는 직접 API 호출
 */
const ClaudeAIAdapter = {
  name: 'claude',

  async analyzeDream(content) {
    // TODO: Phase 2에서 구현
    // const response = await fetch('/api/analyze-dream', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ content }),
    // });
    // return response.json();
    throw new Error('Claude AI Adapter not implemented yet');
  },

  async generateForecast({ recentDreams, recentLogs }) {
    // TODO: Phase 2에서 구현
    throw new Error('Claude AI Adapter not implemented yet');
  },

  async generatePatternInsights({ dreams, logs }) {
    // TODO: Phase 2에서 구현
    throw new Error('Claude AI Adapter not implemented yet');
  },
};

/**
 * AI Adapter 레지스트리
 */
const adapters = {
  mock: MockAIAdapter,
  claude: ClaudeAIAdapter,
};

/**
 * 현재 활성 어댑터
 */
let currentAdapter = MockAIAdapter;

/**
 * AI Adapter 설정
 * @param {'mock' | 'claude'} type
 */
export function setAIAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    console.warn(`Unknown AI adapter: ${type}, falling back to mock`);
    currentAdapter = MockAIAdapter;
  } else {
    currentAdapter = adapter;
  }
}

/**
 * 현재 AI Adapter 가져오기
 * @returns {AIAdapter}
 */
export function getAIAdapter() {
  return currentAdapter;
}

/**
 * AI Adapter 이름 가져오기
 * @returns {string}
 */
export function getAIAdapterName() {
  return currentAdapter.name;
}

export default {
  setAIAdapter,
  getAIAdapter,
  getAIAdapterName,
};
