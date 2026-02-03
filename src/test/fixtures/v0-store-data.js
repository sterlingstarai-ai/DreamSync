/**
 * v0 스토어 데이터 Fixture
 * 이전 버전(또는 손상된) 데이터로 마이그레이션/복구 테스트용
 */

/** v0 auth: onboardingCompleted 필드 누락, settings 불완전 */
export const V0_AUTH = {
  user: {
    id: 'v0-user-001',
    email: 'old@test.com',
    // name 필드 누락
    avatar: null,
    settings: {
      notifications: true,
      // reminderTime, theme, language 누락
    },
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  isAuthenticated: true,
};

/** v0 dreams: analysis 구조가 다름 (symbols에 frequency 없음) */
export const V0_DREAMS = {
  dreams: [
    {
      id: 'd-v0-001',
      userId: 'v0-user-001',
      content: '바다에서 수영하는 꿈',
      // voiceUrl 누락
      analysis: {
        symbols: [
          { name: '바다', meaning: '감정의 깊이' },
          // frequency 필드 누락
        ],
        emotions: [{ name: '평온한', intensity: 6 }],
        themes: ['자아 탐색'],
        intensity: 5,
        interpretation: '무의식의 신호입니다.',
        // actionSuggestion 누락
      },
      createdAt: '2025-01-15T08:00:00.000Z',
      // updatedAt 누락
    },
  ],
};

/** v0 checkins: sleep 필드 구조 다름 */
export const V0_CHECKINS = {
  logs: [
    {
      id: 'c-v0-001',
      userId: 'v0-user-001',
      date: '2025-01-15',
      condition: 3,
      emotions: ['평온한'],
      stressLevel: 2,
      // events 필드 누락
      // sleep 필드 누락
      createdAt: '2025-01-15T07:00:00.000Z',
    },
  ],
};

/** v0 forecasts: prediction 키 대신 result 키 사용 */
export const V0_FORECASTS = {
  forecasts: [
    {
      id: 'f-v0-001',
      userId: 'v0-user-001',
      date: '2025-01-15',
      // prediction 대신 result 키 (구버전 시뮬레이션)
      result: {
        condition: 3,
        confidence: 50,
        summary: '보통의 하루입니다.',
      },
      actual: null,
      accuracy: null,
      createdAt: '2025-01-15T06:00:00.000Z',
    },
  ],
};

/** v0 symbols: firstSeen/lastSeen 누락, count 타입이 string */
export const V0_SYMBOLS = {
  symbols: [
    {
      id: 's-v0-001',
      userId: 'v0-user-001',
      name: '바다',
      meaning: '감정의 깊이',
      count: '2', // string이어야 하는데 number가 아님
      dreamIds: ['d-v0-001'],
      // firstSeen, lastSeen 누락
      createdAt: '2025-01-15T08:00:00.000Z',
      // updatedAt 누락
    },
  ],
};

/** 완전히 손상된 데이터 */
export const CORRUPTED_JSON = 'not a valid json {{{';

/** 빈 상태 */
export const EMPTY_STATE = {};

/** null 필드들 */
export const NULL_FIELDS = {
  dreams: null,
  logs: null,
  symbols: null,
  forecasts: null,
};
