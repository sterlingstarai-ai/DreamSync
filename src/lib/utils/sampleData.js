/**
 * 샘플 데이터 로드 유틸리티
 * 온보딩/디버그 시 빈 상태 대신 데모 데이터를 볼 수 있도록 제공
 */
import { generateId } from './id';
import { getTodayString } from './date';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useSymbolStore from '../../store/useSymbolStore';
import useForecastStore from '../../store/useForecastStore';

const SAMPLE_VERSION = 'v2';

/**
 * 샘플 데이터를 스토어에 로드
 * @param {string} userId
 * @returns {{added: boolean, dreamsAdded: number, checkInsAdded: number, forecastsAdded: number, symbolsSynced: number}}
 */
export function loadSampleData(userId) {
  if (!userId) {
    return {
      added: false,
      dreamsAdded: 0,
      checkInsAdded: 0,
      forecastsAdded: 0,
      symbolsSynced: 0,
    };
  }

  const today = getTodayString();
  const yesterday = offsetDate(today, -1);
  const twoDaysAgo = offsetDate(today, -2);

  // 꿈 템플릿
  const dreamTemplates = [
    {
      sampleKey: `${SAMPLE_VERSION}:dream:sea`,
      content: '넓은 바다에서 수영을 하고 있었다. 물이 맑고 따뜻했고, 돌고래가 옆에서 같이 헤엄쳤다.',
      voiceUrl: null,
      date: yesterday,
      analysis: {
        symbols: [
          { name: '바다', meaning: '무의식, 감정의 깊이', category: 'nature' },
          { name: '돌고래', meaning: '지혜, 유희, 자유', category: 'animal' },
        ],
        emotions: [
          { name: '평온', intensity: 0.8 },
          { name: '자유', intensity: 0.7 },
        ],
        themes: ['자유', '탐험'],
        intensity: 6,
        interpretation: '내면의 감정이 안정되어 있으며 새로운 가능성을 탐색하고 있습니다.',
      },
      createdAt: `${yesterday}T07:30:00.000Z`,
      updatedAt: `${yesterday}T07:31:00.000Z`,
    },
    {
      sampleKey: `${SAMPLE_VERSION}:dream:mountain`,
      content: '높은 산 정상에서 일출을 보고 있었다. 구름 위로 빛이 퍼지면서 눈물이 났다.',
      voiceUrl: null,
      date: twoDaysAgo,
      analysis: {
        symbols: [
          { name: '산', meaning: '목표, 성취, 도전', category: 'nature' },
          { name: '일출', meaning: '새로운 시작, 희망', category: 'nature' },
        ],
        emotions: [
          { name: '감동', intensity: 0.9 },
          { name: '성취감', intensity: 0.8 },
        ],
        themes: ['성취', '감동'],
        intensity: 8,
        interpretation: '최근의 노력이 결실을 맺고 있으며 내적 성장을 경험하고 있습니다.',
      },
      createdAt: `${twoDaysAgo}T06:45:00.000Z`,
      updatedAt: `${twoDaysAgo}T06:46:00.000Z`,
    },
  ];

  // 체크인 템플릿
  const checkInTemplates = [
    {
      sampleKey: `${SAMPLE_VERSION}:checkin:yesterday`,
      date: yesterday,
      condition: 4,
      emotions: ['peaceful', 'grateful'],
      stressLevel: 2,
      events: ['health_exercise', 'social_friends'],
      note: null,
      sleep: null,
      createdAt: `${yesterday}T21:00:00.000Z`,
    },
    {
      sampleKey: `${SAMPLE_VERSION}:checkin:twoDaysAgo`,
      date: twoDaysAgo,
      condition: 3,
      emotions: ['neutral', 'hopeful'],
      stressLevel: 3,
      events: ['work_busy'],
      note: null,
      sleep: null,
      createdAt: `${twoDaysAgo}T21:00:00.000Z`,
    },
  ];

  // 예보 템플릿
  const forecastTemplates = [
    {
      sampleKey: `${SAMPLE_VERSION}:forecast:today`,
      date: today,
      prediction: {
        condition: 4,
        confidence: 72,
        summary: '안정적인 컨디션이 예상됩니다. 너무 무리하지 말고 흐름을 유지해보세요.',
        risks: ['저녁 피로 누적'],
        suggestions: ['점심 후 10분 산책', '취침 1시간 전 스크린 타임 줄이기'],
      },
      actual: null,
      accuracy: null,
      experiment: {
        plannedSuggestions: ['점심 후 10분 산책', '취침 1시간 전 스크린 타임 줄이기'],
        completedSuggestions: [],
        completionRate: 0,
        updatedAt: `${today}T08:30:00.000Z`,
      },
      createdAt: `${today}T08:30:00.000Z`,
    },
  ];

  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const symbolStore = useSymbolStore.getState();
  const forecastStore = useForecastStore.getState();

  const existingDreams = dreamStore.dreams.filter(d => d.userId === userId);
  const existingDreamKeys = new Set(
    existingDreams.map(d => getDreamIdentity(d.createdAt, d.content)),
  );
  const sampleDreamTemplateKeys = new Set(
    dreamTemplates.map(d => getDreamIdentity(d.createdAt, d.content)),
  );

  const existingCheckInDates = new Set(
    checkInStore.logs
      .filter(l => l.userId === userId)
      .map(l => l.date),
  );
  const existingForecastDates = new Set(
    forecastStore.forecasts
      .filter(f => f.userId === userId)
      .map(f => f.date),
  );

  const dreams = dreamTemplates.map(template => ({
    id: generateId(),
    userId,
    ...template,
  }));

  const checkIns = checkInTemplates.map(template => ({
    id: generateId(),
    userId,
    ...template,
  }));
  const forecasts = forecastTemplates.map(template => ({
    id: generateId(),
    userId,
    ...template,
  }));

  const newDreams = dreams.filter(
    dream => !existingDreamKeys.has(getDreamIdentity(dream.createdAt, dream.content)),
  );

  const newCheckIns = checkIns.filter(
    checkIn => !existingCheckInDates.has(checkIn.date),
  );
  const newForecasts = forecasts.filter(
    forecast => !existingForecastDates.has(forecast.date),
  );

  if (newDreams.length > 0) {
    useDreamStore.setState(state => ({ dreams: [...newDreams, ...state.dreams] }));
  }

  if (newCheckIns.length > 0) {
    useCheckInStore.setState(state => ({ logs: [...newCheckIns, ...state.logs] }));
  }
  if (newForecasts.length > 0) {
    useForecastStore.setState(state => ({ forecasts: [...newForecasts, ...state.forecasts] }));
  }

  // 심볼은 꿈 분석 결과를 기준으로 재구성 (중복 dreamId는 store에서 자동 방지)
  const allSampleDreams = [
    ...existingDreams.filter(d => sampleDreamTemplateKeys.has(getDreamIdentity(d.createdAt, d.content))),
    ...newDreams,
  ];

  let symbolsSynced = 0;
  for (const dream of allSampleDreams) {
    if (!dream.analysis?.symbols?.length) continue;
    symbolStore.syncSymbolsFromAnalysis(userId, dream.id, dream.analysis.symbols);
    symbolsSynced += dream.analysis.symbols.length;
  }

  return {
    added: newDreams.length > 0 || newCheckIns.length > 0 || newForecasts.length > 0,
    dreamsAdded: newDreams.length,
    checkInsAdded: newCheckIns.length,
    forecastsAdded: newForecasts.length,
    symbolsSynced,
  };
}

/**
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * @param {string} createdAt
 * @param {string} content
 * @returns {string}
 */
function getDreamIdentity(createdAt, content) {
  return `${createdAt}|${(content || '').trim()}`;
}
