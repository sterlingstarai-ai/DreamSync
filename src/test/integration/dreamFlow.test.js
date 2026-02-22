/**
 * 통합 테스트: 꿈 → 분석 → 심볼 → 체크인 → 예보 전체 플로우
 *
 * 실제 Zustand 스토어를 사용하여 크로스 스토어 상호작용 검증.
 * AI/네트워크만 mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import useDreamStore from '../../store/useDreamStore';
import useSymbolStore from '../../store/useSymbolStore';
import useCheckInStore from '../../store/useCheckInStore';
import useForecastStore from '../../store/useForecastStore';

// Mock AI 서비스 (지연 제거)
vi.mock('../../lib/ai/service', () => ({
  analyzeDream: vi.fn().mockResolvedValue({
    symbols: [
      { name: '바다', meaning: '감정의 깊이를 상징합니다.', frequency: 1 },
      { name: '물', meaning: '무의식의 흐름을 나타냅니다.', frequency: 1 },
    ],
    emotions: [{ name: '평온한', intensity: 6 }],
    themes: ['자아 탐색', '내면의 성장'],
    intensity: 5,
    interpretation: '이 꿈은 내면의 감정 흐름을 탐색하려는 무의식의 신호입니다.',
    actionSuggestion: '명상으로 마음을 정리해보세요.',
  }),
  generateForecast: vi.fn().mockResolvedValue({
    condition: 4,
    confidence: 65,
    summary: '전반적으로 좋은 컨디션이 예상됩니다.',
    risks: [],
    suggestions: ['가벼운 스트레칭으로 시작하세요.'],
  }),
}));

const TEST_USER_ID = 'integration-test-user';

describe('Dream → Report 전체 플로우', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
    useSymbolStore.getState().reset();
    useCheckInStore.getState().reset();
    useForecastStore.getState().reset();
  });

  it('꿈 생성 → 자동 분석 → 심볼 사전 동기화', async () => {
    // 1. 꿈 생성 (autoAnalyze: true)
    const dream = await useDreamStore.getState().addDream({
      content: '바다에서 수영하는 꿈을 꿨다',
      userId: TEST_USER_ID,
      autoAnalyze: true,
    });

    expect(dream).toBeDefined();
    expect(dream.id).toBeDefined();

    // 분석이 비동기로 실행되므로 대기
    await vi.waitFor(() => {
      const updated = useDreamStore.getState().getDreamById(dream.id);
      expect(updated.analysis).not.toBeNull();
    });

    // 2. 분석 결과 검증
    const analyzedDream = useDreamStore.getState().getDreamById(dream.id);
    expect(analyzedDream.analysis.symbols).toHaveLength(2);
    expect(analyzedDream.analysis.symbols[0].name).toBe('바다');
    expect(analyzedDream.analysis.emotions).toHaveLength(1);

    // 3. 심볼 사전에 자동 동기화 확인
    await vi.waitFor(() => {
      const seaSymbol = useSymbolStore.getState().getSymbolByName(TEST_USER_ID, '바다');
      expect(seaSymbol).toBeDefined();
      expect(seaSymbol.count).toBe(1);
      expect(seaSymbol.dreamIds).toContain(dream.id);
    });
  });

  it('체크인 → 예보 생성 → 정확도 기록', async () => {
    // 1. 체크인 저장
    const checkIn = await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER_ID,
      condition: 4,
      emotions: ['행복한', '평온한'],
      stressLevel: 2,
      events: ['운동'],
      sleep: { bedtime: '23:00', wakeTime: '07:00', quality: 4 },
    });

    expect(checkIn).toBeDefined();
    expect(useCheckInStore.getState().hasCheckedInToday(TEST_USER_ID)).toBe(true);

    // 2. 예보 생성
    const recentLogs = useCheckInStore.getState().getRecentLogs(TEST_USER_ID, 7);
    const forecast = await useForecastStore.getState().generateForecast({
      userId: TEST_USER_ID,
      recentDreams: [],
      recentLogs,
    });

    expect(forecast).toBeDefined();
    expect(forecast.prediction.condition).toBe(4);
    expect(forecast.prediction.confidence).toBe(65);

    // 3. 실제 결과 기록 → 정확도
    useForecastStore.getState().recordActual(forecast.id, { condition: 4 });

    const updated = useForecastStore.getState().getForecastById(forecast.id);
    expect(updated.accuracy).toBe(100); // 예측=4, 실제=4 → 100%
  });

  it('꿈 2개 생성 → 심볼 빈도 누적', async () => {
    // 첫 번째 꿈
    const dream1 = await useDreamStore.getState().addDream({
      content: '바다에서 물고기를 봤다',
      userId: TEST_USER_ID,
      autoAnalyze: true,
    });

    await vi.waitFor(() => {
      expect(useDreamStore.getState().getDreamById(dream1.id).analysis).not.toBeNull();
    });

    // 두 번째 꿈 (같은 심볼)
    const dream2 = await useDreamStore.getState().addDream({
      content: '다시 바다에 갔다',
      userId: TEST_USER_ID,
      autoAnalyze: true,
    });

    await vi.waitFor(() => {
      expect(useDreamStore.getState().getDreamById(dream2.id).analysis).not.toBeNull();
    });

    // 심볼 빈도 누적 확인
    await vi.waitFor(() => {
      const seaSymbol = useSymbolStore.getState().getSymbolByName(TEST_USER_ID, '바다');
      expect(seaSymbol.count).toBe(2);
      expect(seaSymbol.dreamIds).toContain(dream1.id);
      expect(seaSymbol.dreamIds).toContain(dream2.id);
    });
  });

  it('꿈 + 체크인 → 예보 → 주간 통계 종합', async () => {
    // 1. 꿈 기록
    await useDreamStore.getState().addDream({
      content: '높은 산에 올라갔다',
      userId: TEST_USER_ID,
      autoAnalyze: false, // 빠른 테스트를 위해 자동분석 끔
    });

    // 2. 체크인 기록
    await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER_ID,
      condition: 3,
      emotions: ['평온한'],
      stressLevel: 3,
      events: [],
    });

    // 3. 예보 생성
    const recentDreams = useDreamStore.getState().getRecentDreams(TEST_USER_ID, 7);
    const recentLogs = useCheckInStore.getState().getRecentLogs(TEST_USER_ID, 7);

    const forecast = await useForecastStore.getState().generateForecast({
      userId: TEST_USER_ID,
      recentDreams,
      recentLogs,
    });

    // 4. 종합 검증
    expect(useDreamStore.getState().getDreamsByUser(TEST_USER_ID)).toHaveLength(1);
    expect(useCheckInStore.getState().getAverageCondition(TEST_USER_ID, 7)).toBe(3);
    expect(forecast.prediction).toBeDefined();
    expect(useForecastStore.getState().getRecentForecasts(TEST_USER_ID)).toHaveLength(1);
  });

  it('같은 날 체크인 업데이트 (중복 방지)', async () => {
    // 첫 번째 체크인
    await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER_ID,
      condition: 2,
      emotions: ['슬픈'],
      stressLevel: 4,
      events: [],
    });

    // 같은 날 두 번째 체크인 → 업데이트
    await useCheckInStore.getState().addCheckIn({
      userId: TEST_USER_ID,
      condition: 4,
      emotions: ['행복한'],
      stressLevel: 2,
      events: ['운동'],
    });

    // 로그는 1개만 (덮어쓰기)
    const logs = useCheckInStore.getState().getRecentLogs(TEST_USER_ID, 7);
    expect(logs).toHaveLength(1);
    expect(logs[0].condition).toBe(4);
    expect(logs[0].emotions).toEqual(['행복한']);
  });
});
