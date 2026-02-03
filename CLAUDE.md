# DreamSync 프로젝트 컨텍스트

> Claude Code가 이 프로젝트를 빠르게 이해하기 위한 메모리 파일

## 프로젝트 개요

**DreamSync** - React + Capacitor 하이브리드 앱

- **타입**: React PWA + Capacitor 네이티브 앱 (iOS/Android)
- **버전**: 0.0.1
- **상태**: Phase 1-4 구현 완료 + 품질 보증 완료 (122 tests, 14 files, 0 lint errors)
- **배포**: https://dreamsync-app.vercel.app
- **GitHub**: https://github.com/sterlingstarai-ai/DreamSync

## 기술 스택

```
React 19 + Vite 7
Tailwind CSS 4
Capacitor 8 (iOS/Android)
Zustand (상태관리 + persist with Capacitor Preferences)
Zod (AI 응답 검증)
React Router DOM (라우팅)
PWA (vite-plugin-pwa)
```

## 설치된 Capacitor 플러그인

| 플러그인 | 용도 |
|---------|------|
| @capacitor/app | 앱 생명주기, 백버튼 |
| @capacitor/status-bar | 상태바 스타일 |
| @capacitor/splash-screen | 스플래시 화면 |
| @capacitor/keyboard | 키보드 이벤트 |
| @capacitor/haptics | 진동 피드백 |
| @capacitor/network | 네트워크 상태 |
| @capacitor/preferences | 로컬 저장소 (Zustand persist 백엔드) |
| @capacitor/local-notifications | 로컬 알림 |

## 주요 설정값

| 항목 | 값 |
|------|-----|
| App ID | `com.dreamsync.app` |
| Web Dir | `dist` |

## 폴더 구조

```
src/
├── components/
│   ├── common/        # Button, Card, Input, Modal, Toast, Loading, BottomNav, SafeArea
│   ├── dream/         # DreamInput, VoiceRecorder, DreamCard, DreamAnalysis, SymbolTag
│   ├── checkin/       # ConditionSlider, EmotionPicker, StressLevel, EventChips, SleepInput
│   ├── forecast/      # ForecastCard, ConfidenceMeter, ActionGuide
│   ├── report/        # WeeklyChart, PatternCard, InsightList
│   ├── symbol/        # SymbolCard, SymbolDetail, SymbolSearch
│   ├── uhs/           # UHSCard, UHSBreakdown
│   └── settings/      # FeatureToggle, HealthKitSetup, ProfileSection, NotificationSettings
├── pages/
│   ├── Auth/          # Login, Signup
│   ├── Dashboard.jsx
│   ├── DreamCapture.jsx
│   ├── CheckIn.jsx
│   ├── WeeklyReport.jsx
│   ├── SymbolDictionary.jsx
│   ├── Settings.jsx
│   └── Onboarding.jsx
├── hooks/             # useAuth, useDreams, useCheckIn, useForecast, useSymbols, useFeatureFlags, useVoiceInput, useNotifications, useHealthKit, useNetworkStatus
├── lib/
│   ├── adapters/      # storage, ai, analytics, api (Adapter 패턴)
│   ├── ai/            # schemas, mock, service, analyzeDream, generateForecast
│   ├── health/        # healthkit (HealthKit/Health Connect 연동)
│   ├── scoring/       # confidence, uhs (Confidence/UHS 점수 계산)
│   ├── offline/       # syncQueue (오프라인 동기화 큐)
│   ├── utils/         # date, error, id
│   ├── capacitor.js
│   └── storage.js
├── store/             # useAuthStore, useDreamStore, useCheckInStore, useForecastStore, useSymbolStore, useFeatureFlagStore, useSettingsStore
├── types/             # JSDoc 타입 정의
├── constants/         # emotions, events, featureFlags
├── Router.jsx
├── App.jsx
├── main.jsx
└── index.css          # 다크 모드 디자인 시스템

public/
ios/
android/
.github/
```

## 자주 쓰는 명령어

```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npm run cap:sync     # 빌드 + Capacitor 동기화
npm run cap:ios      # 빌드 + iOS Xcode 열기
npm run cap:android  # 빌드 + Android Studio 열기
```

## Xcode Cloud 트러블슈팅 (중요!)

### 빌드 실패 시 확인 순서

1. **스키마 공유 여부** (가장 먼저!)
   ```bash
   ls ios/App/App.xcodeproj/xcshareddata/xcschemes/
   ```

2. **Package.resolved 존재 여부**

3. **ci_post_clone.sh 스크립트**

### 필수 파일 (Xcode Cloud)

| 파일 | 상태 |
|------|------|
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | ✅ 생성됨 |
| `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | ✅ 생성됨 |
| `ios/App/ci_scripts/ci_post_clone.sh` | ✅ 생성됨 |

---

## 작업 기록

### 2026-02-03: 프로젝트 생성 및 기초 설정
- Vite 7 + React 19 초기화
- Capacitor 8 설치 및 iOS/Android 플랫폼 추가
- Tailwind CSS 4 설정
- PWA 지원 (vite-plugin-pwa)
- Zustand 상태관리 설정
- 필수 Capacitor 플러그인 설치 (7개)
- 프로젝트 구조 생성 (components, pages, hooks, lib, store, constants)
- Xcode Cloud 필수 파일 생성 (스키마, Package.resolved, ci_post_clone.sh)
- Dependabot 설정
- @ 절대경로 alias 설정

### 2026-02-03: Phase 1-4 코어 구현

#### Adapter 패턴 구현 (주석 처리 대신 런타임 전환)
- `src/lib/adapters/storage.js` - Capacitor Preferences 기반 (localStorage 대신)
- `src/lib/adapters/ai.js` - Mock/Claude AI 전환
- `src/lib/adapters/analytics.js` - Mock/Mixpanel 전환
- `src/lib/adapters/api.js` - Local/Supabase 전환
- 환경변수로 어댑터 선택: `VITE_AI`, `VITE_ANALYTICS`, `VITE_BACKEND`

#### 스코어링 로직 (지침서 기반)
- `src/lib/scoring/confidence.js`
  - 40% 데이터 완성도 + 35% 수면 신호 + 15% 일관성 + 10% 모델 건강도
- `src/lib/scoring/uhs.js` (UHS: Unconscious Health Score)
  - 35% 수면 + 25% 스트레스 + 15% 꿈 + 15% 기분변동 + 10% 예측오차
  - 의료/진단 표현 금지, "참고 지표" 고정 문구

#### AI 시스템
- Zod 스키마로 AI 응답 검증 (`src/lib/ai/schemas.js`)
- Mock AI 응답 생성기 (한글 감정/심볼 패턴)
- 꿈 분석 + 예보 생성 함수

#### Zustand 스토어 (7개)
- 모든 스토어 Capacitor Preferences persist 적용
- useAuthStore, useDreamStore, useCheckInStore, useForecastStore, useSymbolStore, useFeatureFlagStore, useSettingsStore

#### UI/UX
- 다크 모드 디자인 시스템 (CSS 변수)
- 공통 컴포넌트 9개: Button, Card, Input, Modal, Toast, Loading, BottomNav, SafeArea, ErrorBoundary
- 페이지 9개: Login, Signup, Dashboard, DreamCapture, CheckIn, WeeklyReport, SymbolDictionary, Settings, Onboarding
- Protected Route + 온보딩 플로우

#### 훅 8개
- useAuth, useDreams, useCheckIn, useForecast, useSymbols, useFeatureFlags, useVoiceInput, useNotifications

#### Feature Flags
- healthkit (Phase 2), saju (Phase 3), uhs (Phase 4), b2b (Phase 4)

### 2026-02-03: 세부 컴포넌트 구현

#### Dream 컴포넌트 (5개)
- DreamInput - 꿈 텍스트 입력 (자동 높이, 글자수 제한)
- VoiceRecorder - 음성 녹음 (Web Speech API)
- DreamCard - 꿈 목록 카드
- DreamAnalysis - AI 분석 결과 표시
- SymbolTag - 심볼 태그 (카테고리별 이모지)

#### CheckIn 컴포넌트 (5개)
- ConditionSlider - 컨디션 선택 (1-5 이모지)
- EmotionPicker - 감정 선택 (최대 3개)
- StressLevel - 스트레스 2축 (업무/관계)
- EventChips - 이벤트 선택 칩
- SleepInput - 수면 정보 입력 (취침/기상/품질)

#### Forecast 컴포넌트 (3개)
- ForecastCard - 오늘의 예보 카드 (compact/full)
- ConfidenceMeter - 신뢰도 원형 미터
- ActionGuide - 추천 행동 체크리스트

#### Report 컴포넌트 (3개)
- WeeklyChart - 주간 차트 (condition/stress/sleep/dream)
- PatternCard - 패턴 카드 (트렌드 표시)
- InsightList - 인사이트 목록

#### Symbol 컴포넌트 (3개)
- SymbolCard - 심볼 카드 (빈도/트렌드)
- SymbolDetail - 심볼 상세 (일반/개인 의미)
- SymbolSearch - 심볼 검색 (카테고리 필터)

#### UHS 컴포넌트 (2개)
- UHSCard - 웰니스 지수 카드 (compact/full)
- UHSBreakdown - 상세 분석 (5개 구성요소, 개선 팁)

#### Settings 컴포넌트 (4개)
- FeatureToggle - 기능 토글 스위치
- HealthKitSetup - 건강 앱 연동 설정
- ProfileSection - 프로필 섹션
- NotificationSettings - 알림 설정 (아침/저녁)

#### HealthKit 연동 (Phase 2 준비)
- `src/lib/health/healthkit.js` - Mock HealthKit/Health Connect
- `src/hooks/useHealthKit.js` - HealthKit 훅
- 플랫폼 자동 감지 (iOS/Android/Web)
- 수면 데이터 조회/동기화 인터페이스

---

### 2026-02-03: 품질 보증 및 안정성

#### ESLint 정리
- ESLint 설정 최적화 (android/ios globalIgnores, argsIgnorePattern 개선)
- 470개 에러 → 0개 에러, 24개 경고 (모두 허용 수준)
- 28개 파일의 미사용 변수/임포트 정리

#### 테스트 커버리지 (122 tests, 14 files)
- useAuthStore (11 tests) - 회원가입, 로그인, 설정 업데이트
- useDreamStore (9 tests) - CRUD, 날짜 필터, 심볼 추출
- useCheckInStore (11 tests) - CRUD, 연속 기록, 주간 완료율
- useForecastStore (10 tests) - 생성, 정확도 계산, 중복 방지
- useSymbolStore (14 tests) - CRUD, 검색, 동기화, 사용자 분리
- syncQueue (5 tests) - 초기화, 큐잉, 구독
- confidence/uhs scoring (12 tests)
- Login (4 tests) - 렌더링, 게스트 로그인, 빈 폼 검증
- Signup (5 tests) - 렌더링, 비밀번호 길이/불일치 검증
- Dashboard (4 tests) - 인사말, 퀵액션, 통계, 예보 플레이스홀더
- CheckIn (4 tests) - 단계 렌더링, 진행 표시, 단계 네비게이션
- DreamCapture (4 tests) - 입력 폼, 저장 버튼, 빈 상태

#### 버그 수정
- 꿈 분석 → 심볼 사전 동기화 누락 (useDreamStore에서 useSymbolStore.syncSymbolsFromAnalysis 호출 추가)
- StressSlider 컴포넌트를 부모 렌더 함수 밖으로 이동 (react-hooks 위반 수정)
- Toast의 addToast → removeToast 의존성 순서 수정

#### 안정성 개선
- ErrorBoundary 컴포넌트 추가 (런타임 에러 graceful 처리)
- 오프라인 동기화 큐 (syncQueue.js + useNetworkStatus 훅)
- OfflineBanner - 오프라인 시 화면 상단 알림 배너
- 에러 상태 표시 - 4개 페이지에 에러 배너/토스트 추가 (Dashboard, DreamCapture, CheckIn, WeeklyReport)
- 접근성 개선 - aria-labels, roles, aria-pressed, progressbar 속성 추가 (CheckIn, Dashboard, DreamCapture)
- 프로덕션 로그 게이팅 - logger 유틸리티로 50+ console.* 호출 DEV 모드 전용으로 전환 (22개 파일)
- React.lazy() + Suspense 코드 분할 (9개 라우트)

#### 전체 앱 플로우 검증 (Playwright)
- Login → Guest → Onboarding → Dashboard → DreamCapture → AI분석 → CheckIn (4단계) → Report → SymbolDictionary → Settings → Feature Flags → UHS 카드

---

## 아키텍처 원칙

### Adapter 패턴 (중요!)
```
절대 주석 처리로 "나중에 연동" 하지 않음
→ 인터페이스 고정, 구현체 분리, env로 런타임 선택
```

### 데이터 저장
```
localStorage 사용 금지 (보안/유실 위험)
→ Capacitor Preferences 사용
→ 민감 데이터는 추후 암호화 레이어 추가
```

### UHS 주의사항
```
의료/진단/치료 표현 절대 금지
→ "참고 지표", "웰니스 상태" 등 사용
→ UHS_DISCLAIMER 상수 고정 사용
```

---

## 환경 변수 (.env)

```bash
VITE_BACKEND=local    # local | supabase
VITE_AI=mock          # mock | claude
VITE_ANALYTICS=mock   # mock | mixpanel
VITE_FLAGS=local      # local | remote
```
