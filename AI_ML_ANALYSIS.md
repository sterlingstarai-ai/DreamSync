# DreamSync AI/ML 시스템 분석 보고서

> 2026-02-21 | AI/ML 엔지니어 관점 분석

**Status**: Mock AI + Edge Function 스켈레톤 구현 완료, Phase 2부터 실제 LLM 통합 예정

---

## 1. AI 아키텍처 평가

### 1.1 Adapter 패턴 (설계 우수)

**구조:**
```
src/lib/ai/service.js          # 단일 진입점 (모든 AI 호출)
   ↓
src/lib/adapters/ai/           # 어댑터 레이어
   ├── mock.js                 # Mock AI (개발/테스트)
   └── edge.js                 # Edge Function 프록시 (프로덕션)
```

**장점:**
- **런타임 전환**: 환경변수 `VITE_AI=mock|edge`로 구현체 선택 → 주석 처리 불필요
- **테스트 용이성**: Mock AI가 결정적 응답 생성 → UI/통합 테스트 안정화
- **보안 격리**: 클라이언트는 AI 호출 인터페이스만 알고, 실제 구현은 모름

**개선점 (Phase 2+):**
```javascript
// 향후 추가 가능한 어댑터 (예시)
adapters = {
  'mock': MockAIAdapter,        // 현재
  'edge': EdgeAIAdapter,        // 현재
  'claude-sdk': ClaudeDirectSDK, // Phase 2: 직접 SDK 호출 (로컬 테스트)
  'openai': OpenAIAdapter,       // Phase 3: 다중 LLM 지원
};
```

---

## 2. 프롬프트 설계 분석

### 2.1 현황: 프롬프트 코드 없음

**관찰:**
- `src/lib/ai/service.js`: 프롬프트 로직 X (어댑터 구현에 위임)
- `mock.js`: 프롬프트 대신 패턴 매칭 + 템플릿 (개발용)
- `supabase/functions/ai-proxy/index.ts`: 스텁 함수 (하드코딩 응답)

**의도:** Phase 1-2는 Mock, Phase 3부터 실제 프롬프트 시스템 구축

### 2.2 프롬프트 시스템 설계 제언 (Phase 2+)

#### 꿈 분석 프롬프트 (analyzeDream)

```typescript
// src/lib/ai/prompts/analyzeDream.ts
export const ANALYZE_DREAM_SYSTEM = `
당신은 경험이 풍부한 꿈 분석가입니다.
사용자의 꿈 내용을 분석하여 심리학적 통찰력을 제공합니다.

지침:
1. 심볼 추출 (1-10개): Jung의 원형론 + 사용자 개인 문맥 고려
2. 감정 인식 (1-5개): 텍스트의 정서 강도 평가 (1-10)
3. 테마 식별 (1-5개): "변화", "관계", "두려움" 등 고차원 테마
4. 강도 평가 (1-10): 감정의 총 강도 합산 → 정규화
5. 해석 생성: 100-500자의 심리학적 해석
6. 반성 질문: 사용자 자기 탐색을 돕는 3개 질문

출력: JSON { symbols, emotions, themes, intensity, interpretation, reflectionQuestions }
`;

export const ANALYZE_DREAM_USER = (dream: string) => `
오늘 꿈:
\`\`\`
${dream}
\`\`\`

분석해주세요.
`;
```

**프롬프트 특성:**
- 일관성: Jung 심리학 이론 기반 (라이브러리 전체와 일관)
- 구조화: JSON 스키마와 정확히 일치하는 출력 형식
- 안전성: 의료/진단 표현 없음 (면책 조항 → 클라이언트에서 고정)

#### 예보 생성 프롬프트 (generateForecast)

```typescript
// src/lib/ai/prompts/generateForecast.ts
export const GENERATE_FORECAST_SYSTEM = `
당신은 웰니스 트렌드 분석가입니다.
최근 데이터를 바탕으로 오늘의 신체/정신 상태를 예측합니다.

입력:
- recentDreams: 최근 7일 꿈 분석 결과
- recentCheckIns: 최근 7일 체크인 (컨디션/스트레스)

분석 프로세스:
1. 꿈 강도 추세: 증가/감소/안정 식별
2. 컨디션 모멘텀: 이동 평균 + 변동성
3. 스트레스 패턴: 업무/관계 2축 분석
4. 예측: 1-5 스케일 (1:주의, 3:보통, 5:최상)
5. 신뢰도: 데이터 완성도 기반 (0-100)
6. 제안: 오늘의 3-4개 실행 가능한 행동

제약:
- 의료 조언 금지 ("휴식이 필요합니다" 가능, "치료를 받으세요" 불가)
- 신뢰도 < 50%이면 "더 많은 데이터 필요" 강조
`;
```

### 2.3 프롬프트 거버넌스 (제안)

**파일 구조:**
```
src/lib/ai/prompts/
├── index.ts              # 프롬프트 registry
├── analyzeDream.ts       # 꿈 분석 (시스템/유저)
├── generateForecast.ts   # 예보 생성
├── patterns.ts           # 주간 패턴 분석
└── constants.ts          # 공통 테마, 심볼 목록
```

**버전 관리:**
```bash
# 프롬프트 변경 시 자동 추적
src/lib/ai/prompts/version.ts
export const PROMPT_VERSION = 'v1.0'; // semver
export const PROMPT_HASH = 'abc123...'; // SHA-256 of all prompts
```

---

## 3. Zod 스키마 검증 (설계 탁월)

### 3.1 현황

| 스키마 | 목적 | 위치 | 검증 강도 |
|--------|------|------|---------|
| `DreamAnalysisSchema` | 꿈 분석 응답 | `src/lib/ai/schemas.js:29` | 🟢 높음 |
| `ForecastPredictionSchema` | 예보 응답 | `src/lib/ai/schemas.js:42` | 🟢 높음 |
| `PatternInsightSchema` | 주간 패턴 | `src/lib/ai/schemas.js:56` | 🟡 중간 |
| `WearableSleepSummarySchema` | 웨어러블 데이터 | `src/lib/health/schemas.js:26` | 🟢 높음 |

### 3.2 스키마 강도 분석

**DreamAnalysisSchema (좋음):**
```javascript
symbols: z.array(SymbolSchema).min(1).max(10),
// ✓ 최소 1개 (빈 배열 방지)
// ✓ 최대 10개 (UI 과부하 방지)

emotions: z.array(EmotionSchema).min(1).max(5),
// ✓ 감정은 더 제한적 (5개)

intensity: z.number().min(1).max(10),
// ✓ 1-10 범위 강제

interpretation: z.string().min(10).max(500),
// ✓ 길이 제한 (의미 있는 해석 강제)
```

**개선점:**

1. **URI 검증 추가** (이미지/음성 저장 시)
   ```javascript
   symbol: z.object({
     name: z.string(),
     meaning: z.string(),
     imageUrl: z.string().url().optional(), // Phase 2
     audioUrl: z.string().url().optional(),
   })
   ```

2. **의료 표현 탐지** (런타임 필터)
   ```typescript
   const MEDICAL_TERMS = ['진단', '치료', '약물', '의료'];

   export function validateNonMedical(text: string): boolean {
     return !MEDICAL_TERMS.some(term => text.includes(term));
   }

   // service.js에서
   const analysis = await adapter.analyzeDream(content);
   if (!validateNonMedical(analysis.interpretation)) {
     throw new AppError('의료 표현이 포함되어 있습니다.');
   }
   ```

3. **언어 검증** (국제화 지원)
   ```javascript
   export const DreamAnalysisSchema = z.object({
     // ...
     language: z.enum(['ko', 'en', 'ja']).default('ko'),
     // ...
   })
   ```

---

## 4. Mock AI 품질 평가

### 4.1 현황 분석

**파일:** `src/lib/ai/mock.js` (412줄)

**기능:**
1. **심볼 추출** (keyword matching): 15개 패턴
2. **감정 추출** (keyword matching): 8개 패턴
3. **테마 선택** (심볼 기반): 13개 테마
4. **해석 생성** (템플릿): 3개 템플릿

**예시 심볼 패턴:**
```javascript
{ keywords: ['물', '바다', '강', ...],
  symbol: { name: '물', meaning: '감정의 흐름...' } }
```

### 4.2 장점

| 항목 | 평가 | 근거 |
|------|------|------|
| 결정성 | 🟢 높음 | 같은 입력 → 일정 출력 (테스트 안정화) |
| 한글 지원 | 🟢 완전 | 한글 키워드, 한글 응답 |
| 다양성 | 🟡 제한적 | 패턴 매칭만 (NLP 없음) |
| 현실성 | 🟡 낮음 | 실제 꿈처럼 연쇄 패턴 부족 |

### 4.3 개선 제안 (Phase 1.5)

#### 4.3.1 더 나은 의존성 추출

**현재:**
```javascript
// 단순 키워드 매칭
if (content.includes('물')) → '물' 심볼
```

**개선:**
```javascript
// 복합 패턴 매칭
const patterns = [
  {
    regex: /\b(물|바다|강|호수|수영)\b/g,
    symbol: { name: '물', ... },
    confidence: 0.9  // 신뢰도 추적
  },
  {
    regex: /(떨어지|추락|넘어지).*(꿈|장면)/,
    symbol: { name: '추락', ... },
    confidence: 0.95
  }
];
```

#### 4.3.2 감정 강도 캘리브레이션

**현재:**
```javascript
const rawIntensity = pattern.emotion.intensity + Math.floor(Math.random() * 3) - 1;
// 고정값 ± 1
```

**개선:**
```javascript
// 텍스트 길이 + 반복도 고려
function estimateIntensity(content, baseIntensity) {
  const repetitionFactor = (content.split(keyword).length - 1) * 0.1;
  const lengthFactor = Math.log(content.length) / 10;
  return clamp(1, 10, baseIntensity + repetitionFactor + lengthFactor);
}
```

#### 4.3.3 심볼 개인화 학습

**아이디어:**
```javascript
// useSleepStore에서 과거 심볼 이력 추적
const userSymbolFreq = {
  '물': 5,  // 사용자가 5번 봤음
  '날다': 3,
  '집': 2
};

// 새 꿈 분석 시 개인 가중치 적용
function scoreSymbol(symbol, userFreq) {
  const personalFreq = userFreq[symbol.name] || 0;
  return {
    ...symbol,
    personalRelevance: 0.5 + (personalFreq / 10) * 0.5  // 0.5-1.0
  };
}
```

### 4.4 Test Coverage (현황)

**파일:** `src/lib/ai/mock.test.js`

```bash
✓ generateMockDreamAnalysis (4 tests)
✓ generateMockForecast (3 tests)
✓ generateMockPatternInsights (2 tests)
```

**테스트 품질:** 🟡 기본 수준
- 해피 케이스만 검증
- Edge case 부족 (빈 입력, 초장 입력, 특수문자 등)

**권장:**
```javascript
describe('Mock AI', () => {
  // Edge case
  test('should handle empty dream', () => {
    const result = generateMockDreamAnalysis('');
    expect(result.symbols).toBeDefined();
  });

  test('should handle very long dream', () => {
    const longDream = 'a'.repeat(5000);
    const result = generateMockDreamAnalysis(longDream);
    expect(result.interpretation.length).toBeLessThanOrEqual(500);
  });

  // Determinism
  test('should produce same output for same input', () => {
    const input = '물이 흘러가는 꿈';
    const result1 = generateMockDreamAnalysis(input);
    const result2 = generateMockDreamAnalysis(input);
    expect(result1).toEqual(result2);  // 현재는 Math.random() 때문에 실패
  });
});
```

---

## 5. UHS/Confidence 스코어링 알고리즘

### 5.1 Confidence (신뢰도) - 설계 탁월

**공식:**
```
confidence = 40% × dataCompleteness +
             35% × sleepSignalQuality +
             15% × consistencyScore +
             10% × modelHealth
```

**각 항목 분석:**

| 항목 | 가중치 | 평가 | 근거 |
|------|--------|------|------|
| Data Completeness | 40% | 🟢 적절 | 꿈(30점) + 체크인(50점) + 웨어러블(20점) |
| Sleep Signal Quality | 35% | 🟢 적절 | 수면 시간, REM%, Deep%, HRV |
| Consistency Score | 15% | 🟡 약함 | 과거 예측 정확도만 사용 (초기 사용자는 50) |
| Model Health | 10% | 🟡 부족 | 실패율 기반 (Mock일 때 상수 80) |

**수면 신호 품질 세부:**

| 신호 | 점수 | 특징 |
|------|------|------|
| 수면 시간 7-9h | 40점 | 가장 신뢰할 수 있는 지표 |
| REM 18-28% | 20점 | 적정 REM 범위 |
| Deep 13-23% | 20점 | 적정 딥 수면 범위 |
| HRV ≥50ms | 20점 | 심박변이도 (스트레스 지표) |

**개선점:**

1. **콜드스타트 문제:** 초기 사용자는 일관성 점수가 50 (중립)
   ```javascript
   // 개선안: 초기 부스트
   if (accuracyHistory.length === 0) {
     return 60; // 50 → 60 (새 사용자 격려)
   }
   ```

2. **웨어러블 소스 우선순위 반영 부족:**
   ```javascript
   // 개선안: 수동 입력 vs 웨어러블 차등화
   export function calculateSleepSignalQuality({
     sleepDuration,
     source = 'manual'  // 'manual' | 'healthkit' | 'healthconnect'
   }) {
     const sourceWeight = {
       'healthkit': 1.2,      // 웨어러블 더 신뢰
       'healthconnect': 1.2,
       'manual': 1.0
     };
     // 계산 후 가중치 적용
     return score * sourceWeight[source];
   }
   ```

### 5.2 UHS (Unconscious Health Score) - 설계 양호

**공식:**
```
UHS = 35% × sleep +
      25% × stress +
      15% × dream +
      15% × moodDrift +
      10% × predictionError
```

**평가:**

| 컴포넌트 | 의도 | 가중치 | 평가 |
|----------|------|--------|------|
| Sleep | 수면 품질 | 35% | 🟢 타당 (수면이 가장 중요) |
| Stress | 스트레스 저감 | 25% | 🟢 타당 (2축: 업무/관계) |
| Dream | 꿈 강도 | 15% | 🟡 논쟁의 여지 (무조건 낮음이 좋은가?) |
| Mood Drift | 정서 안정성 | 15% | 🟢 타당 (표준편차 기반) |
| Prediction Error | 모델 정확도 | 10% | 🟡 약한 신호 |

**논쟁점: "꿈 강도가 높으면 UHS 낮음"?**

```javascript
// 현재 로직 (src/lib/scoring/uhs.js:90)
if (avgIntensity >= 4 && avgIntensity <= 6) score += 30;  // 이상적
else if (avgIntensity >= 3 && avgIntensity < 4) score += 20;
else if (avgIntensity > 6 && avgIntensity <= 7) score += 20;  // 약간 감점
else score += 10;
```

**문제:** 높은 강도 꿈 = 나쁜 건강?
- ❌ 심리학적으로 타당하지 않음
- ❌ 창의적 활동 후 강한 꿈은 정상
- ✓ 반복적인 악몽은 분리해서 처리해야 함

**개선안:**
```javascript
// 꿈 강도 대신 "꿈 패턴 안정성" 평가
export function calculateDreamScore({
  avgIntensity,
  symbolVariety,
  dreamCount,
  nightmareFreq  // 새 파라미터: 악몽 빈도
}) {
  let score = 50;

  // 안정성: 강도가 일관적이면 좋음 (높음 일관, 낮음 일관 모두 좋음)
  const intensityVariance = calculateVariance(intensityHistory);
  if (intensityVariance < 1.5) score += 30;  // 안정적

  // 악몽 페널티
  if (nightmareFreq > 0.3) score -= 20;  // 주 2회 이상 악몽

  return clamp(score);
}
```

### 5.3 윤리: 의료 면책 (우수)

**현황:**
```javascript
// src/lib/scoring/uhs.js:240
export const UHS_DISCLAIMER =
  '이 점수는 참고 지표이며, 의료적 진단이나 조언이 아닙니다.';
```

**UI에서의 사용:**
- ✓ UHS 카드 항상 표시
- ✓ 클릭 시 상세 면책 문구 표시

**개선점:**

1. **지역별 면책 문구 (국제화)**
   ```typescript
   export const UHS_DISCLAIMER = {
     ko: '이 점수는 참고 지표이며, 의료적 진단이 아닙니다.',
     en: 'This score is for reference only and is not a medical diagnosis.',
     ja: 'このスコアは参考値であり、医学的診断ではありません。'
   };
   ```

2. **페이즈별 제약 추가**
   ```javascript
   // Phase 2 이전: UHS 점수 절대값 노출 금지
   if (!featureFlags.advancedUHS) {
     // "좋음", "보통", "주의" 등 범주형만 노출
     return getUHSLevel(score);  // → "좋음"
   }
   ```

---

## 6. 웨어러블 데이터 활용 (Phase 2)

### 6.1 현황: 구조 설계 우수

**데이터 흐름:**
```
iOS HealthKit / Android Health Connect
           ↓
    WearableSleepSummary (Zod 정규화)
           ↓
    useSleepStore (Zustand persist)
           ↓
    calculateConfidence() / calculateUHS()
           ↓
    ForecastCard 표시
```

**소스 우선순위:**
```javascript
// src/store/useSleepStore.js (Line ~50)
const source = {
  'manual': 3,      // 사용자가 직접 입력 (가장 신뢰)
  'healthkit': 2,   // iOS 자동 수집
  'healthconnect': 1 // Android 자동 수집
};
// 점수 높을수록 덮어쓰기 가능
```

**개선점:**

1. **동적 권가중:** 과거 정확도 기반
   ```javascript
   // 초기: healthkit 점수 2.0
   // 예측 정확도가 높으면: healthkit 점수 2.5로 상향
   function adaptSourceWeight(source, recentAccuracy) {
     const baseWeight = SOURCE_WEIGHTS[source];
     const accuracyBonus = recentAccuracy > 70 ? 0.5 : 0;
     return baseWeight + accuracyBonus;
   }
   ```

2. **이상 탐지:**
   ```javascript
   // 갑자기 수면 시간이 3배 → 데이터 오류 가능성
   function isAnomalous(current, history) {
     const mean = average(history);
     const stdDev = stdev(history);
     const zScore = Math.abs((current - mean) / stdDev);
     return zScore > 3;  // 3-시그마 규칙
   }
   ```

### 6.2 Confidence에서의 활용

**현황:**
```javascript
// src/lib/scoring/confidence.js:34
export function calculateDataCompleteness({
  dreamCount,      // 최근 7일
  checkInCount,    // 최근 7일
  hasWearableData  // boolean
}) {
  const dreamScore = Math.min(30, (dreamCount / 3) * 30);
  const checkInScore = Math.min(50, (checkInCount / 5) * 50);
  const wearableScore = hasWearableData ? 20 : 0;  // 있으면 20점, 없으면 0
}
```

**개선점:**

```javascript
// 웨어러블 스코어를 이진이 아닌 연속값으로
function calculateDataCompleteness({
  dreamCount,
  checkInCount,
  wearableDays  // 웨어러블 활성화 일수 (0-7)
}) {
  const dreamScore = Math.min(30, (dreamCount / 3) * 30);
  const checkInScore = Math.min(50, (checkInCount / 5) * 50);
  const wearableScore = (wearableDays / 7) * 20;  // 일수 비례

  return clamp(dreamScore + checkInScore + wearableScore);
}
```

---

## 7. 개인화 및 적응성

### 7.1 현황: 구조 미흡

**현재 구현:**
- ✓ 심볼 사전 저장 (useSideSymbolStore)
- ✓ 개인 의미 추가 가능 (SymbolSchema.personalMeaning)
- ✗ 반복 학습 메커니즘 없음
- ✗ A/B 테스트 프레임워크 없음

### 7.2 개인화 로드맵 (제안)

#### Phase 2.5: 심볼 빈도 추적
```javascript
// src/store/useSymbolStore.js에 추가
export const useSymbolStore = create(
  persist(
    (set, get) => ({
      // ...
      symbolStats: {
        '물': { frequency: 5, lastSeen: '2026-02-20', userSentiment: 'positive' },
        '추락': { frequency: 2, lastSeen: '2026-02-15', userSentiment: 'negative' },
      },

      recordSymbolAppearance(symbol) {
        const stats = get().symbolStats[symbol.name];
        if (stats) {
          stats.frequency++;
          stats.lastSeen = new Date().toISOString();
        }
      }
    }),
    { name: 'symbol-store' }
  )
);
```

#### Phase 3: 예측 정확도 피드백 루프
```javascript
// src/lib/ai/service.js에 추가
export async function recordForecastAccuracy(forecastId, actualCondition) {
  const forecast = await getForecastById(forecastId);
  const error = Math.abs(forecast.condition - actualCondition);
  const accuracy = Math.max(0, 100 - error * 20);  // 5점 차이 = 0%

  await updateAccuracyHistory(accuracy);
  // Confidence 재계산 시 사용
}
```

#### Phase 4: 사용자 선호도 학습
```typescript
// 사용자가 해석을 좋아/싫어하면 피드백
export interface AnalysisUserFeedback {
  forecastId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  customTheme?: string;  // "사용자 추가 테마"
}

// 모델 재학습 데이터로 수집
const feedback = await analytics.getFeedback(userId, '30d');
// → Edge Function에 전달 → Anthropic fine-tuning 신청
```

---

## 8. 보안 및 윤리

### 8.1 현황: 우수 (PII 보호)

**구현:**
```javascript
// src/lib/utils/mask.js
export function maskDreamContent(content) {
  return `[꿈 내용 ${content.length}자]`;
}

// 사용: src/lib/adapters/ai/edge.js:156
logger.info('[EdgeAI] analyzeDream 호출', {
  content: maskDreamContent(content)  // 원문 노출 안 함
});
```

**Audit Log:**
```javascript
// supabase/functions/audit-log/index.ts
function stripSensitiveFields(obj) {
  const SENSITIVE_KEYS = [
    'content', 'dream', 'interpretation',
    'password', 'token', 'apiKey', ...
  ];

  // 화이트리스트만 기록
  return pick(obj, ALLOWED_FIELDS);
}
```

**평가:** 🟢 설계 우수

### 8.2 향후 보안 강화 (Phase 2+)

#### 1. API Key 로테이션
```typescript
// supabase/functions/ai-proxy/index.ts
// Phase 2에서 구현
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
// ❌ 하드코딩 (현재)
// ✓ 주기적 로테이션 (권장)
```

#### 2. 요청 서명 (HMAC)
```typescript
// 클라이언트 → Edge Function
const signature = crypto.createHmac(
  'sha256',
  CLIENT_SECRET
).update(JSON.stringify(payload)).digest('hex');

// Edge에서 검증
const expectedSig = hmac(payload, Deno.env.get('CLIENT_SECRET'));
if (signature !== expectedSig) {
  return response(403, 'Invalid signature');
}
```

#### 3. 혼합 암호화 (저장 시)
```javascript
// 매우 민감한 데이터는 추가 암호화
async function encryptDreamContent(content) {
  const key = await deriveKey(userId);  // 사용자별 파생 키
  return crypto.subtle.encrypt('AES-GCM', key, content);
}
```

---

## 9. 발전 방향 (AI 고도화 로드맵)

### Phase 2 (2026-03월): 실제 LLM 통합

**작업:**
1. ✓ Anthropic Claude API 통합 (`ANTHROPIC_API_KEY` 처리)
2. ✓ 프롬프트 시스템 구축 (`src/lib/ai/prompts/`)
3. ✓ 스트리밍 응답 지원 (긴 해석)
4. ✓ Rate Limit 실제 구현 (Supabase RLS)

**예상 성능:**
- 응답 시간: 1-3초 (현재 mock: 0.5-1.5초)
- 정확도: BLEU ≈ 70-80% (한국 꿈 분석 벤치)

### Phase 3 (2026-04월): 패턴 인식 고도화

**작업:**
1. NLP 기반 심볼 추출 (keyword matching → entity recognition)
2. 감정 분석 (transformer 모델)
3. 주간 패턴 군집화 (k-means 또는 GMM)

**기술:**
```python
# Supabase Edge Function (Python variant)
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

# 사용자의 모든 꿈 해석
dreams_text = [d['interpretation'] for d in recent_dreams]
vectorizer = TfidfVectorizer()
vectors = vectorizer.fit_transform(dreams_text)

# 패턴 클러스터
kmeans = KMeans(n_clusters=3)
clusters = kmeans.fit_predict(vectors)
# → "관계 갈등", "업무 스트레스", "성장 욕구" 등 자동 분류
```

### Phase 4 (2026-05월): 다중 LLM 지원

**확장:**
```javascript
// 비용/성능 최적화를 위해 여러 모델 사용
adapters = {
  'claude-3-sonnet': {...},    // 기본 (빠름, 저비용)
  'claude-3-opus': {...},      // 프리미엄 (느림, 고정확)
  'openai-gpt-4-turbo': {...}, // 대안
};

// 비용 제약 시: Sonnet, 정확도 중요 시: Opus
function selectModel(userId) {
  const isPremium = await checkPremiumStatus(userId);
  return isPremium ? 'claude-3-opus' : 'claude-3-sonnet';
}
```

### Phase 5 (2026-06월이후): Fine-Tuning & 맞춤화

**데이터 수집:**
```javascript
// 사용자 피드백 루프
interface TrainingData {
  dream: string;
  analysis: DreamAnalysis;
  userFeedback: {
    accuracy: 1-5,      // "정확한가?"
    helpful: 1-5,       // "도움이 되었나?"
    customThemes: string[]
  }
}

// 월 1회 fine-tuning
await fineTuneModel({
  baseModel: 'claude-3-sonnet',
  trainingData: await collectFeedback(30), // 지난 30일
  hyperparameters: {
    learningRate: 1e-4,
    epochs: 3
  }
});
```

---

## 10. 종합 평가 및 권장사항

### 10.1 강점 (Strengths)

| 항목 | 평가 | 근거 |
|------|------|------|
| Adapter 패턴 | ⭐⭐⭐⭐⭐ | 런타임 전환 가능, 테스트 용이 |
| Zod 검증 | ⭐⭐⭐⭐⭐ | 모든 응답 강제 검증, 의료 표현 걸러낼 기반 |
| Confidence 알고리즘 | ⭐⭐⭐⭐ | 가중치 합리적, 웨어러블 통합 |
| Mock AI | ⭐⭐⭐⭐ | 결정적, 한글 지원, 기본 패턴 충분 |
| PII 보호 | ⭐⭐⭐⭐⭐ | 마스킹, Audit log 구현 완료 |

### 10.2 약점 (Weaknesses)

| 항목 | 평가 | 영향 | 우선순위 |
|------|------|------|----------|
| 프롬프트 시스템 없음 | ⭐⭐ | Phase 2 지연 | P0 |
| UHS 꿈 강도 공식 부정확 | ⭐⭐⭐ | 심리학적 타당성 낮음 | P1 |
| 개인화 학습 부재 | ⭐⭐ | 장기 정확도 | P2 |
| Mock AI 패턴 제한적 | ⭐⭐⭐ | 테스트 현실성 | P1 |
| API Key 하드코딩 대비 | ⭐⭐ | 보안 (미배포 상태) | P0 |

### 10.3 즉시 실행 항목 (다음 2주)

**P0 (Critical):**
- [ ] Phase 2 프롬프트 시스템 설계 (`src/lib/ai/prompts/`)
- [ ] Edge Function 스텁 → 실제 Claude API 호출 (with secret handling)

**P1 (High):**
- [ ] UHS 알고리즘 재검토 (꿈 강도 → 패턴 안정성으로 변경)
- [ ] Mock AI 테스트 케이스 확충 (Edge case, determinism 검증)

**P2 (Medium):**
- [ ] 심볼 개인화 추적 시작 (빈도, 감정)
- [ ] 의료 표현 탐지 필터 추가

---

## 11. 결론

DreamSync의 AI/ML 시스템은 **Phase 1-2 기초 설계가 탁월함:**

✓ Adapter 패턴으로 확장 가능 아키텍처
✓ Zod 기반 강력한 응답 검증
✓ Mock AI가 현실적 수준
✓ PII 보호 및 의료 윤리 의식

**다음 단계:** Phase 2에서 실제 LLM(Claude) 통합 시 위 기초를 활용하면 신뢰할 수 있는 AI 시스템 구축 가능. 프롬프트 설계와 피드백 루프가 성공의 핵심.

---

**작성:** AI/ML Engineer
**검토 대상:** Engineering Lead, Product Manager, Security Team
**다음 리뷰:** Phase 2 프롬프트 설계 완료 후 (약 2주)
