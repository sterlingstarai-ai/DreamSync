# DreamSync Data Model

## Core Entities

### Dream

꿈 기록 및 AI 분석 결과

```javascript
/**
 * @typedef {Object} Dream
 * @property {string} id - UUID
 * @property {string} content - 꿈 내용 (원문)
 * @property {string} [title] - 제목 (자동 생성)
 * @property {string} date - YYYY-MM-DD
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {'text' | 'voice'} source - 입력 방식
 * @property {DreamAnalysis} [analysis] - AI 분석 결과
 * @property {boolean} isAnalyzing - 분석 중 여부
 * @property {string} [analysisError] - 분석 오류
 */

/**
 * @typedef {Object} DreamAnalysis
 * @property {Symbol[]} symbols - 등장 심볼
 * @property {Emotion[]} emotions - 감정
 * @property {string[]} themes - 테마
 * @property {number} intensity - 강도 (1-10)
 * @property {string} interpretation - AI 해석
 * @property {string} [actionSuggestion] - 행동 제안
 */
```

### DailyLog (CheckIn)

저녁 체크인 데이터

```javascript
/**
 * @typedef {Object} DailyLog
 * @property {string} id - UUID
 * @property {string} date - YYYY-MM-DD
 * @property {number} condition - 컨디션 (1-5)
 * @property {string[]} emotions - 선택한 감정 ID 배열
 * @property {number} stressLevel - 스트레스 (1-5)
 * @property {string[]} events - 선택한 이벤트 ID 배열
 * @property {SleepData} [sleep] - 수면 정보
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} SleepData
 * @property {string} bedTime - HH:mm
 * @property {string} wakeTime - HH:mm
 * @property {number} duration - 분 단위
 * @property {number} quality - 품질 (1-5)
 * @property {number} [remPercent] - REM 비율 (웨어러블)
 * @property {number} [deepPercent] - 딥 수면 비율 (웨어러블)
 * @property {number} [hrv] - HRV (웨어러블)
 */
```

### Forecast

예보 및 정확도

```javascript
/**
 * @typedef {Object} Forecast
 * @property {string} id - UUID
 * @property {string} date - YYYY-MM-DD
 * @property {Prediction} prediction - 예측 결과
 * @property {Object} inputData - 입력 데이터 요약
 * @property {number} [actual] - 실제 컨디션 (1-5)
 * @property {number} [accuracy] - 정확도 (0-100)
 * @property {string} createdAt - ISO timestamp
 * @property {string} [recordedAt] - 실제값 기록 시간
 */

/**
 * @typedef {Object} Prediction
 * @property {number} condition - 예측 컨디션 (1-5)
 * @property {number} confidence - 신뢰도 (0-100)
 * @property {string} summary - 요약 문장
 * @property {string[]} risks - 리스크 태그 (1-3개)
 * @property {string[]} suggestions - 행동 제안 (2-4개)
 */
```

### PersonalSymbol

개인 심볼 사전

```javascript
/**
 * @typedef {Object} PersonalSymbol
 * @property {string} name - 심볼 이름
 * @property {SymbolCategory} category - 카테고리
 * @property {string} [meaning] - 일반적 의미
 * @property {string} [personalMeaning] - 개인적 의미
 * @property {number} frequency - 등장 횟수
 * @property {string} firstSeen - 첫 등장 날짜
 * @property {string} lastSeen - 최근 등장 날짜
 * @property {'up' | 'down' | 'stable'} [trend] - 트렌드
 * @property {string} [notes] - 메모
 */

/**
 * @typedef {'water' | 'fire' | 'sky' | 'animal' | 'person' |
 *           'building' | 'nature' | 'vehicle' | 'food' |
 *           'object' | 'abstract'} SymbolCategory
 */
```

### UHSScore (Phase 4)

UHS 점수 (참고 지표, 의료 진단 아님)

```javascript
/**
 * @typedef {Object} UHSScore
 * @property {number} score - 총점 (0-100)
 * @property {UHSBreakdown} breakdown - 구성요소별 점수
 * @property {'높음' | '보통' | '낮음'} confidence - 데이터 신뢰도
 * @property {string} calculatedAt - 계산 시간
 */

/**
 * @typedef {Object} UHSBreakdown
 * @property {number} sleep - 수면 점수 (35% 가중치)
 * @property {number} stress - 스트레스 점수 (25% 가중치)
 * @property {number} dream - 꿈 점수 (15% 가중치)
 * @property {number} mood - 기분 안정성 (15% 가중치)
 * @property {number} prediction - 예측 정확도 (10% 가중치)
 */
```

## Support Entities

### Emotion

감정 상수

```javascript
/**
 * @typedef {Object} Emotion
 * @property {string} id - 고유 ID
 * @property {string} name - 한글명
 * @property {string} emoji - 이모지
 * @property {string} color - 색상 코드
 * @property {'positive' | 'negative' | 'neutral'} valence
 */
```

### Event

이벤트 상수

```javascript
/**
 * @typedef {Object} Event
 * @property {string} id - 고유 ID
 * @property {string} name - 한글명
 * @property {string} emoji - 이모지
 * @property {string} category - 카테고리
 */
```

### FeatureFlags

```javascript
/**
 * @typedef {Object} FeatureFlags
 * @property {boolean} healthkit - HealthKit 연동
 * @property {boolean} saju - 사주 분석
 * @property {boolean} uhs - UHS 표시
 * @property {boolean} b2b - B2B API
 */
```

## Scoring Formulas

### Confidence Score

```
confidence = clamp(0, 100,
  0.40 × dataCompleteness +
  0.35 × sleepSignalQuality +
  0.15 × consistencyScore +
  0.10 × modelHealth
)
```

### UHS Score

```
UHS = clamp(0, 100,
  0.35 × sleepScore +
  0.25 × stressScore +
  0.15 × dreamScore +
  0.15 × moodDriftScore +
  0.10 × predictionErrorScore
)
```

⚠️ **중요**: UHS는 참고 지표이며, 의료적 진단이 아닙니다.

## Storage

### Local (Phase 1)
- Zustand persist → Capacitor Preferences
- Key prefix: `dreamsync_`

### Remote (Phase 2+)
- Supabase PostgreSQL
- Row Level Security (RLS)

## Data Privacy

### 전송 금지 데이터
- 꿈 원문 (`content`)
- 감정 세부 내용 (`emotions`)
- 건강 데이터 (`sleepData`, `hrv`)

### 허용 데이터
- 길이 (`content_length`)
- 해시 값
- 집계 통계
