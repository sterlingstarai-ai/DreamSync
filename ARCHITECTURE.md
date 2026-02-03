# DreamSync Architecture

## 레이어 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                                │
│  (Pages, Components, Hooks)                                      │
├─────────────────────────────────────────────────────────────────┤
│                       Service Layer                              │
│  (dreamService, checkinService, forecastService, etc.)          │
├─────────────────────────────────────────────────────────────────┤
│                       Domain Layer                               │
│  (scoring/confidence, scoring/uhs, ai/schemas)                  │
├─────────────────────────────────────────────────────────────────┤
│                       Adapter Layer                              │
│  (storage, ai, analytics, flags)                                │
├─────────────────────────────────────────────────────────────────┤
│                      Store Layer                                 │
│  (Zustand stores with Capacitor Preferences persist)           │
├─────────────────────────────────────────────────────────────────┤
│                     Platform Layer                               │
│  (Capacitor plugins, Native APIs)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Adapter 패턴

### 원칙
- **인터페이스 고정**: 각 어댑터는 동일한 메서드 시그니처 제공
- **구현체 분리**: Mock/Local vs Real/Remote 구현체 별도 파일
- **런타임 선택**: 환경변수로 어댑터 선택, 주석 처리 금지

### 어댑터 목록

| 어댑터 | Local/Mock | Remote/Real | 환경변수 |
|--------|------------|-------------|----------|
| Storage | Capacitor Preferences | Supabase | `VITE_BACKEND` |
| AI | MockAIAdapter | ClaudeAIAdapter | `VITE_AI` |
| Analytics | NoopAnalytics | Mixpanel+Sentry | `VITE_ANALYTICS` |
| Flags | LocalFlags | RemoteFlags | `VITE_FLAGS` |

### 사용 예시

```javascript
// src/lib/adapters/index.js
import { MockAIAdapter } from './ai/mock';
import { ClaudeAIAdapter } from './ai/claude';

let currentAI = MockAIAdapter;

export function setAIAdapter(type) {
  currentAI = type === 'claude' ? ClaudeAIAdapter : MockAIAdapter;
}

export function getAIAdapter() {
  return currentAI;
}
```

## Feature Flags

| Flag | 기본값 | 설명 | Phase |
|------|--------|------|-------|
| `healthkit` | false | HealthKit/Health Connect 연동 | 2 |
| `saju` | false | 사주 분석 (미구현) | 3 |
| `uhs` | false | UHS 점수 표시 | 4 |
| `b2b` | false | B2B API 접근 | 4 |

## 데이터 흐름

### 꿈 기록 플로우
```
User Input → DreamCapture Page
           → useDreams hook
           → dreamService.saveDream()
           → AI Adapter (분석)
           → useDreamStore (저장)
           → useSymbolStore (심볼 업데이트)
```

### 예보 생성 플로우
```
Dashboard Load → useForecast hook
              → forecastService.generateTodayForecast()
              → collectForecastData()
              → calculateConfidence() (Domain)
              → AI Adapter (예보 생성)
              → useForecastStore (저장)
```

### UHS 계산 플로우
```
Dashboard/Settings → uhsService.calculateCurrentUHS()
                   → collectUHSData()
                   → calculateUHS() (Domain)
                   → getUHSLevel() (Domain)
```

## 보안 고려사항

### 민감 데이터 처리
- **저장**: Capacitor Preferences (localStorage 사용 금지)
- **전송**: 꿈 원문/감정/건강 데이터 → Sentry/Mixpanel 전송 금지
- **로깅**: 길이/해시만 허용

### UHS 표현 규칙
- 의료/진단/치료 표현 절대 금지
- "참고 지표" 고정 문구 강제
- `UHS_DISCLAIMER` 상수 사용 필수

## 오프라인 지원

### 현재 구현
- Zustand persist → Capacitor Preferences
- 모든 데이터 로컬 저장 우선

### 향후 구현 (Supabase 연동 시)
- Outbox 패턴: 변경 사항 로컬 큐에 저장
- 온라인 복귀 시 자동 동기화
- 충돌 해결: Last Write Wins

## 테스트 전략

### 단위 테스트
- Pure functions: confidence, forecast, uhs 계산
- Zod 스키마 검증

### 통합 테스트
- 꿈 저장 → 분석 → 심볼 업데이트
- 체크인 저장 → 예보 생성

### Feature Flag 테스트
- Off 상태: 전체 플로우 동작 확인
- On 상태: Degrade 동작 확인

## 폴더 구조

```
src/
├── components/
│   ├── common/        # 공통 UI (Button, Card, Modal 등)
│   ├── dream/         # 꿈 관련 컴포넌트
│   ├── checkin/       # 체크인 컴포넌트
│   ├── forecast/      # 예보 컴포넌트
│   ├── report/        # 리포트 컴포넌트
│   ├── symbol/        # 심볼 사전 컴포넌트
│   ├── uhs/           # UHS 컴포넌트
│   └── settings/      # 설정 컴포넌트
├── pages/             # 페이지 컴포넌트
├── hooks/             # 커스텀 훅
├── lib/
│   ├── adapters/      # Adapter 패턴 구현
│   │   ├── storage/   # Local, Supabase
│   │   ├── ai/        # Mock, Claude
│   │   ├── analytics/ # Noop, Mixpanel, Sentry
│   │   └── flags/     # Local, Remote
│   ├── ai/            # AI 스키마, 분석 함수
│   ├── health/        # HealthKit 연동
│   ├── scoring/       # 점수 계산 (Domain)
│   ├── services/      # 비즈니스 로직
│   └── utils/         # 유틸리티
├── store/             # Zustand 스토어
├── constants/         # 상수
└── types/             # JSDoc 타입
```
