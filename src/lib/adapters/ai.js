/**
 * AI Adapter Interface
 * Mock AI ↔ Edge Function AI 전환 가능한 구조
 *
 * 어댑터 패턴:
 * - MockAIAdapter: 개발/테스트용 (Phase 1)
 * - EdgeAIAdapter: Edge Function 프록시 (Phase 2+)
 *
 * ⚠️ 보안 원칙: 클라이언트는 절대 LLM API Key를 소유하지 않는다.
 *    Phase 2에서는 반드시 서버(Edge Function)를 통해 AI 호출.
 */

import { generateMockDreamAnalysis, generateMockForecast, generateMockPatternInsights } from '../ai/mock';
import { EdgeAIAdapter } from './ai/edge';
import logger from '../utils/logger';

/**
 * AI Adapter 인터페이스
 * @typedef {Object} AIAdapter
 * @property {string} name
 * @property {function(string, Object=): Promise<Object>} analyzeDream
 * @property {function(Object): Promise<Object>} generateForecast
 * @property {function(Object): Promise<Array>} generatePatternInsights
 */

/**
 * Mock AI Adapter (Phase 1)
 */
const MockAIAdapter = {
  name: 'mock',

  async analyzeDream(content) {
    return generateMockDreamAnalysis(content);
  },

  async generateForecast({ recentDreams, recentLogs }) {
    return generateMockForecast({ recentDreams, recentLogs });
  },

  async generatePatternInsights({ dreams, logs }) {
    return generateMockPatternInsights({ dreams, logs });
  },
};

// EdgeAIAdapter는 ./ai/edge.js에서 import

/**
 * AI Adapter 레지스트리
 */
const adapters = {
  mock: MockAIAdapter,
  edge: EdgeAIAdapter,
};

/**
 * 현재 활성 어댑터
 */
let currentAdapter = MockAIAdapter;

/**
 * AI Adapter 설정
 * @param {'mock' | 'edge'} type
 */
export function setAIAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    logger.warn(`Unknown AI adapter: ${type}, falling back to mock`);
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
