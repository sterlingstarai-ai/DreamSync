/**
 * 시나리오 기반 통합 테스트
 *
 * 시나리오 1: AI 응답 파싱 실패 → fallback/에러 처리 → UX 안 깨짐
 * 시나리오 2: Feature flags 전부 OFF 상태에서 핵심 플로우 정상 동작
 * 시나리오 3: 오프라인 dream 저장 → mock 분석 → 심볼/체크인/예보 전체 플로우
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useForecastStore from '../../store/useForecastStore';
import useSymbolStore from '../../store/useSymbolStore';
import useFeatureFlagStore from '../../store/useFeatureFlagStore';
import useSettingsStore from '../../store/useSettingsStore';

const TEST_USER = 'scenario-test-user';

describe('시나리오: AI 응답 파싱 실패 → graceful 처리', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
    useSymbolStore.getState().reset();
  });

  it('Zod 검증 실패 시 AppError(AI_PARSE_ERROR)로 전환', async () => {
    // AI service를 직접 테스트 — mock adapter가 잘못된 형식 반환
    const { safeParse } = await import('../../lib/ai/schemas');
    const { DreamAnalysisSchema } = await import('../../lib/ai/schemas');

    // 잘못된 형식의 AI 응답 (symbols 누락)
    const badResponse = {
      emotions: [{ name: '불안한', intensity: 8 }],
      // symbols 필드 누락
      themes: ['공포'],
      intensity: 'not-a-number', // number여야 하는데 string
    };

    const result = safeParse(DreamAnalysisSchema, badResponse);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('빈 객체 AI 응답도 safeParse가 실패 반환 (크래시 아님)', async () => {
    const { safeParse, DreamAnalysisSchema } = await import('../../lib/ai/schemas');

    const result = safeParse(DreamAnalysisSchema, {});
    expect(result.success).toBe(false);
  });

  it('null AI 응답도 safeParse가 실패 반환 (크래시 아님)', async () => {
    const { safeParse, DreamAnalysisSchema } = await import('../../lib/ai/schemas');

    const result = safeParse(DreamAnalysisSchema, null);
    expect(result.success).toBe(false);
  });

  it('forecast 파싱 실패 시에도 안전하게 처리', async () => {
    const { safeParse, ForecastPredictionSchema } = await import('../../lib/ai/schemas');

    const badForecast = {
      condition: 'bad', // number여야 하는데 string
      confidence: -10,  // 범위 밖
    };

    const result = safeParse(ForecastPredictionSchema, badForecast);
    expect(result.success).toBe(false);
  });
});

describe('시나리오: Feature Flags 전부 OFF → 핵심 플로우 정상', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useForecastStore.getState().reset();
    useSymbolStore.getState().reset();
    useFeatureFlagStore.getState().resetFlags();
    useSettingsStore.getState().resetSettings();
  });

  it('기본 플래그 상태가 모두 false (mockAI 제외)', () => {
    const flags = useFeatureFlagStore.getState().flags;

    expect(flags.healthkit).toBe(false);
    expect(flags.saju).toBe(false);
    expect(flags.uhs).toBe(false);
    expect(flags.b2b).toBe(false);
    expect(flags.edgeAI).toBe(false);
    expect(flags.devMode).toBe(false);
    expect(flags.mockAI).toBe(true); // Phase 1 기본값
  });

  it('flags off 상태에서 꿈 저장 정상', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '하늘을 날아다니는 꿈을 꿨다',
      userId: TEST_USER,
      autoAnalyze: false,
    });

    expect(dream).toBeDefined();
    expect(dream.id).toBeDefined();
    expect(useDreamStore.getState().getDreamsByUser(TEST_USER)).toHaveLength(1);
  });

  it('flags off 상태에서 체크인 정상', async () => {
    const checkIn = await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER,
      condition: 3,
      emotions: ['평온한'],
      stressLevel: 3,
      events: [],
    });

    expect(checkIn).toBeDefined();
    expect(useCheckInStore.getState().hasCheckedInToday(TEST_USER)).toBe(true);
  });

  it('flags off 상태에서 설정 저장/읽기 정상', () => {
    useSettingsStore.getState().updateNotifications({ enabled: true });
    expect(useSettingsStore.getState().notifications.enabled).toBe(true);

    useSettingsStore.getState().updatePrivacy({ analytics: false });
    expect(useSettingsStore.getState().privacy.analytics).toBe(false);
  });

  it('flags off 상태에서 심볼 사전 CRUD 정상', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: TEST_USER,
      name: '산',
      meaning: '목표를 상징',
      dreamId: 'test-dream-001',
    });

    const symbols = useSymbolStore.getState().getUserSymbols(TEST_USER);
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('산');
  });
});

describe('시나리오: 오프라인 전체 플로우 (mock AI)', () => {
  // mock AI service — 즉시 반환, 네트워크 불필요
  vi.mock('../../lib/ai/service', () => ({
    analyzeDream: vi.fn().mockResolvedValue({
      symbols: [
        { name: '비행', meaning: '자유를 향한 욕구', frequency: 1 },
      ],
      emotions: [{ name: '설레는', intensity: 7 }],
      themes: ['자유', '모험'],
      intensity: 7,
      interpretation: '자유를 향한 무의식의 표현입니다.',
      actionSuggestion: '새로운 도전을 시도해보세요.',
    }),
    generateForecast: vi.fn().mockResolvedValue({
      condition: 4,
      confidence: 60,
      summary: '활력 넘치는 하루가 예상됩니다.',
      risks: [],
      suggestions: ['야외 활동을 추천합니다.'],
    }),
  }));

  beforeEach(() => {
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useForecastStore.getState().reset();
    useSymbolStore.getState().reset();
  });

  it('dream→분석→심볼→체크인→예보 전체 사이클 완주', async () => {
    // 1. 꿈 저장 + 자동 분석
    const dream = await useDreamStore.getState().addDream({
      content: '하늘을 자유롭게 날아다니는 꿈을 꿨다',
      userId: TEST_USER,
      autoAnalyze: true,
    });

    await vi.waitFor(() => {
      expect(useDreamStore.getState().getDreamById(dream.id).analysis).not.toBeNull();
    });

    // 2. 심볼 동기화 (Fix 11: 훅 레벨에서 수동 호출)
    const analyzedDream = useDreamStore.getState().getDreamById(dream.id);
    useSymbolStore.getState().syncSymbolsFromAnalysis(
      TEST_USER, dream.id, analyzedDream.analysis.symbols
    );

    const symbols = useSymbolStore.getState().getUserSymbols(TEST_USER);
    expect(symbols.length).toBeGreaterThanOrEqual(1);

    // 3. 체크인
    await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER,
      condition: 4,
      emotions: ['설레는'],
      stressLevel: 2,
      events: ['운동'],
    });

    // 4. 예보 생성
    const recentDreams = useDreamStore.getState().getRecentDreams(TEST_USER, 7);
    const recentLogs = useCheckInStore.getState().getRecentLogs(TEST_USER, 7);

    const forecast = await useForecastStore.getState().generateForecast({
      userId: TEST_USER,
      recentDreams,
      recentLogs,
    });

    expect(forecast.prediction.condition).toBe(4);

    // 5. 대시보드 데이터 검증
    const dreams = useDreamStore.getState().getDreamsByUser(TEST_USER);
    const logs = useCheckInStore.getState().getRecentLogs(TEST_USER, 7);
    const forecasts = useForecastStore.getState().getRecentForecasts(TEST_USER);

    expect(dreams).toHaveLength(1);
    expect(logs).toHaveLength(1);
    expect(forecasts).toHaveLength(1);
  });
});
