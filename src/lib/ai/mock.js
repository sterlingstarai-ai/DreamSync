/**
 * Mock AI 응답 생성기
 * 1단계: 로컬 개발용 Mock 데이터
 */
import { EMOTIONS } from '../../constants/emotions';

// 상수 정의
const MOCK_DELAY = {
  DREAM_ANALYSIS: { min: 500, max: 1500 },
  FORECAST: { min: 300, max: 800 },
  PATTERN: { min: 200, max: 400 },
};

const INTENSITY_RANGE = { min: 1, max: 10 };

/**
 * 꿈 내용에서 키워드 추출 (간단한 패턴 매칭)
 */
const SYMBOL_PATTERNS = [
  { keywords: ['물', '바다', '강', '호수', '비', '수영'], symbol: { name: '물', meaning: '감정의 흐름, 무의식의 깊이를 상징합니다.' } },
  { keywords: ['하늘', '날다', '비행', '새', '구름'], symbol: { name: '하늘/비행', meaning: '자유에 대한 갈망, 높은 이상을 나타냅니다.' } },
  { keywords: ['집', '방', '건물', '문', '창문'], symbol: { name: '집', meaning: '자아, 마음의 상태, 안정감을 의미합니다.' } },
  { keywords: ['사람', '누군가', '친구', '가족', '엄마', '아빠'], symbol: { name: '사람', meaning: '관계, 자신의 다른 측면을 투영합니다.' } },
  { keywords: ['동물', '개', '고양이', '뱀', '호랑이', '새'], symbol: { name: '동물', meaning: '본능, 감정, 또는 특정 성격 특성을 상징합니다.' } },
  { keywords: ['차', '자동차', '운전', '버스', '기차'], symbol: { name: '이동수단', meaning: '인생의 방향, 통제력을 나타냅니다.' } },
  { keywords: ['길', '도로', '계단', '다리'], symbol: { name: '길', meaning: '인생의 여정, 선택의 갈림길을 의미합니다.' } },
  { keywords: ['떨어지다', '추락', '넘어지다'], symbol: { name: '추락', meaning: '불안감, 통제력 상실에 대한 두려움입니다.' } },
  { keywords: ['쫓기다', '도망', '쫓아오다'], symbol: { name: '추적', meaning: '회피하고 싶은 감정이나 상황을 나타냅니다.' } },
  { keywords: ['시험', '학교', '교실', '늦다'], symbol: { name: '시험', meaning: '평가에 대한 압박, 준비되지 않은 느낌입니다.' } },
  { keywords: ['죽음', '죽다', '장례'], symbol: { name: '죽음', meaning: '변화, 끝과 새로운 시작을 상징합니다.' } },
  { keywords: ['아기', '임신', '출산'], symbol: { name: '아기', meaning: '새로운 시작, 창조성, 가능성을 의미합니다.' } },
  { keywords: ['돈', '보석', '금', '보물'], symbol: { name: '보물', meaning: '가치, 자존감, 성취를 나타냅니다.' } },
  { keywords: ['불', '화재', '타다'], symbol: { name: '불', meaning: '열정, 분노, 또는 변화의 에너지입니다.' } },
  { keywords: ['숲', '나무', '자연', '꽃'], symbol: { name: '자연', meaning: '성장, 생명력, 무의식의 영역입니다.' } },
];

/**
 * 감정 패턴
 */
const EMOTION_PATTERNS = [
  { keywords: ['무섭다', '두렵다', '공포', '무서운'], emotion: { name: '불안한', intensity: 7 } },
  { keywords: ['행복', '기쁘다', '좋다', '즐겁다'], emotion: { name: '행복한', intensity: 7 } },
  { keywords: ['슬프다', '우울', '눈물'], emotion: { name: '슬픈', intensity: 6 } },
  { keywords: ['화나다', '짜증', '분노'], emotion: { name: '화난', intensity: 7 } },
  { keywords: ['놀라다', '충격', '황당'], emotion: { name: '놀란', intensity: 6 } },
  { keywords: ['이상하다', '혼란', '당황'], emotion: { name: '혼란스러운', intensity: 5 } },
  { keywords: ['평화', '편안', '안정'], emotion: { name: '평온한', intensity: 6 } },
  { keywords: ['그립다', '보고싶다', '추억'], emotion: { name: '그리운', intensity: 6 } },
];

/**
 * 테마 목록
 */
const THEMES = [
  '변화와 전환', '자아 탐색', '관계', '두려움 직면', '성장',
  '자유에 대한 갈망', '과거의 기억', '미래에 대한 불안', '숨겨진 욕구',
  '통제력', '안전과 보호', '상실', '새로운 시작', '내면의 갈등',
];

/**
 * 자기성찰 질문 템플릿
 */
const REFLECTION_QUESTIONS = [
  '이 꿈에서 가장 인상 깊었던 장면은 무엇인가요?',
  '꿈 속 감정이 최근 현실에서 느꼈던 감정과 연결되나요?',
  '꿈에 등장한 {symbol}이 당신에게 어떤 의미가 있나요?',
  '이 꿈을 통해 무의식이 전달하려는 메시지는 무엇일까요?',
  '꿈 속 상황을 바꿀 수 있다면 어떻게 바꾸고 싶나요?',
  '이 꿈과 비슷한 상황을 현실에서 경험한 적이 있나요?',
  '꿈에서 느꼈던 감정을 일상에서 어떻게 표현하고 있나요?',
];

/**
 * 꿈 내용 분석하여 심볼 추출
 * @param {string} content
 * @returns {Array}
 */
function extractSymbols(content) {
  const lowerContent = content.toLowerCase();
  const foundSymbols = [];

  for (const pattern of SYMBOL_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerContent.includes(keyword)) {
        if (!foundSymbols.find(s => s.name === pattern.symbol.name)) {
          foundSymbols.push({
            ...pattern.symbol,
            frequency: 1,
          });
        }
        break;
      }
    }
  }

  // 최소 1개, 최대 5개 심볼
  if (foundSymbols.length === 0) {
    foundSymbols.push({
      name: '미지의 요소',
      meaning: '아직 해석되지 않은 무의식의 메시지가 있습니다.',
      frequency: 1,
    });
  }

  return foundSymbols.slice(0, 5);
}

/**
 * 꿈 내용 분석하여 감정 추출
 * @param {string} content
 * @returns {Array}
 */
function extractEmotions(content) {
  const lowerContent = content.toLowerCase();
  const foundEmotions = [];

  for (const pattern of EMOTION_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerContent.includes(keyword)) {
        if (!foundEmotions.find(e => e.name === pattern.emotion.name)) {
          const emotionData = EMOTIONS.find(e => e.name === pattern.emotion.name);
          const rawIntensity = pattern.emotion.intensity + Math.floor(Math.random() * 3) - 1;
          foundEmotions.push({
            name: pattern.emotion.name,
            intensity: Math.max(INTENSITY_RANGE.min, Math.min(INTENSITY_RANGE.max, rawIntensity)),
            color: emotionData?.color,
          });
        }
        break;
      }
    }
  }

  // 기본 감정 추가
  if (foundEmotions.length === 0) {
    const randomEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    foundEmotions.push({
      name: randomEmotion.name,
      intensity: Math.floor(Math.random() * 5) + 4,
      color: randomEmotion.color,
    });
  }

  return foundEmotions.slice(0, 3);
}

/**
 * 테마 선택
 * @param {Array} symbols
 * @param {Array} emotions
 * @returns {string[]}
 */
function selectThemes(symbols, emotions) {
  const themes = new Set();

  // 심볼 기반 테마
  if (symbols.some(s => s.name.includes('집') || s.name.includes('물'))) {
    themes.add('자아 탐색');
  }
  if (symbols.some(s => s.name.includes('추락') || s.name.includes('추적'))) {
    themes.add('두려움 직면');
  }
  if (symbols.some(s => s.name.includes('하늘') || s.name.includes('길'))) {
    themes.add('자유에 대한 갈망');
  }
  if (symbols.some(s => s.name.includes('사람'))) {
    themes.add('관계');
  }

  // 랜덤 테마 추가
  while (themes.size < 2) {
    themes.add(THEMES[Math.floor(Math.random() * THEMES.length)]);
  }

  return Array.from(themes).slice(0, 3);
}

/**
 * 해석 생성
 * @param {Array} symbols
 * @param {Array} emotions
 * @param {string[]} themes
 * @returns {string}
 */
function generateInterpretation(symbols, emotions, themes) {
  const mainSymbol = symbols[0]?.name || '미지의 요소';
  const mainEmotion = emotions[0]?.name || '복합적인 감정';
  const mainTheme = themes[0] || '내면 탐색';

  const templates = [
    `이 꿈은 '${mainTheme}'과 관련된 메시지를 담고 있습니다. ${mainSymbol}의 등장은 당신의 무의식이 현재 상황에 대해 중요한 신호를 보내고 있음을 나타냅니다. ${mainEmotion} 감정이 두드러지며, 이는 최근 경험과 연결될 수 있습니다.`,
    `${mainSymbol}이 주요 상징으로 나타났습니다. 이는 '${mainTheme}'에 대한 당신의 내면의 고민을 반영합니다. 꿈에서 느낀 ${mainEmotion} 감정은 현실에서 표현되지 못한 감정일 수 있습니다.`,
    `무의식은 ${mainSymbol}을 통해 '${mainTheme}'에 대한 메시지를 전달하고 있습니다. ${mainEmotion} 감정이 강하게 느껴진다면, 이 감정의 근원을 탐색해볼 필요가 있습니다.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 자기성찰 질문 생성
 * @param {Array} symbols
 * @returns {string[]}
 */
function generateQuestions(symbols) {
  const questions = [...REFLECTION_QUESTIONS];
  const mainSymbol = symbols[0]?.name || '상징';

  return questions
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(q => q.replace('{symbol}', mainSymbol));
}

/**
 * Mock 꿈 분석 생성
 * @param {string} content - 꿈 내용
 * @returns {Promise<Object>}
 */
export async function generateMockDreamAnalysis(content) {
  // 약간의 지연으로 실제 API 호출 느낌
  const delay = MOCK_DELAY.DREAM_ANALYSIS.min + Math.random() * (MOCK_DELAY.DREAM_ANALYSIS.max - MOCK_DELAY.DREAM_ANALYSIS.min);
  await new Promise(resolve => setTimeout(resolve, delay));

  const symbols = extractSymbols(content);
  const emotions = extractEmotions(content);
  const themes = selectThemes(symbols, emotions);

  const interpretation = generateInterpretation(symbols, emotions, themes);
  const mainSymbol = symbols[0]?.name || '심볼';

  const analysis = {
    symbols,
    emotions,
    themes,
    intensity: Math.min(10, Math.max(1, Math.round(
      emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
    ))),
    interpretation,
    actionSuggestion: `${mainSymbol}에 대해 일기를 써보거나, 이 감정과 관련된 현실의 상황을 되돌아보세요.`,
    reflectionQuestions: generateQuestions(symbols),
  };

  return analysis;
}

/**
 * Mock 예보 생성
 * @param {Object} params
 * @param {Array} params.recentDreams - 최근 꿈들
 * @param {Array} params.recentLogs - 최근 체크인 로그들
 * @returns {Promise<Object>}
 */
export async function generateMockForecast({ recentDreams = [], recentLogs = [] }) {
  const delay = MOCK_DELAY.FORECAST.min + Math.random() * (MOCK_DELAY.FORECAST.max - MOCK_DELAY.FORECAST.min);
  await new Promise(resolve => setTimeout(resolve, delay));

  // 최근 데이터 기반 간단한 예측
  let baseCondition = 3;
  let confidence = 50;

  if (recentLogs.length > 0) {
    const avgCondition = recentLogs.reduce((sum, log) => sum + log.condition, 0) / recentLogs.length;
    baseCondition = Math.round(avgCondition);
    confidence += recentLogs.length * 5;
  }

  if (recentDreams.length > 0) {
    confidence += recentDreams.length * 3;
  }

  // 약간의 랜덤 변동
  const condition = Math.min(5, Math.max(1, baseCondition + Math.floor(Math.random() * 3) - 1));
  confidence = Math.min(85, confidence);

  const suggestions = [
    '오늘 짧은 명상으로 하루를 시작해보세요.',
    '감사한 것 3가지를 적어보세요.',
    '가벼운 스트레칭으로 몸을 깨워보세요.',
    '중요한 결정은 오후로 미뤄보세요.',
    '충분한 수분 섭취를 챙기세요.',
    '잠시 산책으로 기분 전환을 해보세요.',
  ].sort(() => Math.random() - 0.5).slice(0, 2);

  const summaries = {
    5: '오늘은 에너지가 넘치는 하루가 될 것 같습니다. 중요한 일에 도전해보세요!',
    4: '전반적으로 좋은 컨디션이 예상됩니다. 계획한 일들을 진행하기 좋은 날이에요.',
    3: '평범한 하루가 될 것 같습니다. 무리하지 않고 꾸준히 진행하세요.',
    2: '약간 피로할 수 있는 날입니다. 자신을 돌보는 시간을 가져보세요.',
    1: '힘든 하루가 될 수 있어요. 일정을 조정하고 충분한 휴식을 취하세요.',
  };

  return {
    condition,
    confidence,
    summary: summaries[condition],
    risks: condition <= 2 ? ['피로 누적', '감정 기복'] : [],
    suggestions,
  };
}

/**
 * Mock 주간 패턴 인사이트 생성
 * @param {Object} params
 * @param {Array} params.dreams
 * @param {Array} params.logs
 * @returns {Promise<Array>}
 */
export async function generateMockPatternInsights({ dreams = [], logs = [], checkIns = [] }) {
  const delay = MOCK_DELAY.PATTERN.min + Math.random() * (MOCK_DELAY.PATTERN.max - MOCK_DELAY.PATTERN.min);
  await new Promise(resolve => setTimeout(resolve, delay));

  // Support both 'logs' and 'checkIns' parameter names
  const allLogs = logs.length > 0 ? logs : checkIns;
  const patterns = [];
  const correlations = [];

  if (allLogs.length >= 3) {
    const avgCondition = allLogs.reduce((sum, log) => sum + (log.condition || 3), 0) / allLogs.length;

    if (avgCondition >= 3.5) {
      patterns.push({
        type: 'emotion',
        description: '이번 주 전반적인 컨디션이 좋은 편입니다.',
        confidence: 70,
      });
    } else if (avgCondition <= 2.5) {
      patterns.push({
        type: 'emotion',
        description: '이번 주 컨디션이 다소 저조했습니다.',
        confidence: 75,
      });
    }
  }

  if (dreams.length >= 2) {
    patterns.push({
      type: 'symbol',
      description: '최근 꿈에서 반복되는 패턴이 감지되었습니다.',
      confidence: 60,
    });
  }

  // Extract symbols from dreams if available
  const allSymbols = dreams
    .filter(d => d.analysis?.symbols)
    .flatMap(d => d.analysis.symbols.map(s => s.name));

  if (allSymbols.length > 0) {
    correlations.push({
      factorA: '수면 품질',
      factorB: '꿈 강도',
      correlation: 0.65,
      description: '수면 품질이 좋을수록 꿈의 강도가 높아지는 경향이 있습니다.',
    });
  }

  // 주간 요약 생성
  const weekSummary = patterns.length > 0
    ? '이번 주의 패턴 분석을 통해 몇 가지 흥미로운 연관성을 발견했습니다.'
    : '더 많은 데이터가 쌓이면 정확한 패턴 분석이 가능합니다.';

  return {
    patterns,
    correlations,
    weekSummary,
  };
}

/**
 * Mock AI Adapter
 * 테스트 및 개발용 Mock AI 인터페이스
 */
export const MockAIAdapter = {
  /**
   * 꿈 분석
   * @param {string} content - 꿈 내용
   * @param {Object} context - 추가 컨텍스트
   * @returns {Promise<Object>}
   */
  analyzeDream: async (content, _context = {}) => {
    return generateMockDreamAnalysis(content);
  },

  /**
   * 예보 생성
   * @param {Object} params - 예보 입력 데이터
   * @returns {Promise<Object>}
   */
  generateForecast: async (params) => {
    const { recentDreams = [], recentCheckIns = [], avgCondition, avgStress } = params;

    // avgCondition/avgStress 기반 예측도 지원
    const logs = recentCheckIns.length > 0
      ? recentCheckIns
      : avgCondition ? [{ condition: avgCondition, stressLevel: avgStress || 3 }] : [];

    return generateMockForecast({ recentDreams, recentLogs: logs });
  },

  /**
   * 패턴 인사이트 생성
   * @param {Object} params - 패턴 분석 입력 데이터
   * @returns {Promise<Object>}
   */
  generatePatternInsights: async (params) => {
    return generateMockPatternInsights(params);
  },
};
