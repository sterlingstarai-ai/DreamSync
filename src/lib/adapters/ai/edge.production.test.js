import { beforeEach, describe, expect, it, vi } from 'vitest';
import storage from '../storage';

vi.mock('../../ai/mock', () => ({
  generateMockDreamAnalysis: vi.fn().mockResolvedValue({
    symbols: [{ name: '물', meaning: '감정의 흐름을 상징합니다.', frequency: 1 }],
    emotions: [{ name: '평온한', intensity: 6 }],
    themes: ['자아 탐색'],
    intensity: 5,
    interpretation: 'mock fallback should not be used in production',
    actionSuggestion: '명상',
  }),
  generateMockForecast: vi.fn(),
  generateMockPatternInsights: vi.fn(),
}));

vi.mock('../storage', () => ({
  default: {
    get: vi.fn(async () => ({ state: { token: 'test-token' } })),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

describe('EdgeAIAdapter production mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_EDGE_FUNCTION_URL', 'https://test.supabase.co/functions/v1/ai-proxy');
    vi.stubEnv('PROD', 'true');
    storage.get.mockResolvedValue({ state: { token: 'test-token' } });
  });

  it('does not silently fallback to mock results in production', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const mod = await import('./edge.js');

    await expect(mod.EdgeAIAdapter.analyzeDream('프로덕션 장애 테스트'))
      .rejects.toThrow('AI 브리프가 일시적으로 중단되었습니다. 잠시 후 다시 시도해주세요.');
  });
});
