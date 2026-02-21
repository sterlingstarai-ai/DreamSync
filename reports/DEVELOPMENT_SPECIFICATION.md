# DreamSync 외주 개발 명세서 (Development Specification)

> **문서 버전**: v1.0
> **작성일**: 2026-02-21
> **프로젝트**: DreamSync — 예측형 셀프케어 하이브리드 앱
> **목적**: 외주 개발사 PM이 이 문서만으로 전체 개발/테스트/검수/마케팅 작업을 지시할 수 있도록 작성
> **배포 URL**: https://dreamsync-app.vercel.app
> **GitHub**: https://github.com/sterlingstarai-ai/DreamSync

---

## 목차

1. [프로젝트 개요 및 현황](#1-프로젝트-개요-및-현황)
2. [기술 스택 및 아키텍처](#2-기술-스택-및-아키텍처)
3. [Sprint 1: 측정 + 보안 기반 (Week 1-2)](#3-sprint-1-측정--보안-기반-week-1-2)
4. [Sprint 2: 백엔드 + AI + 온보딩 (Week 3-4)](#4-sprint-2-백엔드--ai--온보딩-week-3-4)
5. [Sprint 3: PWA 소프트 런칭 + 데이터 수집 (Week 5-6)](#5-sprint-3-pwa-소프트-런칭--데이터-수집-week-5-6)
6. [Sprint 4: 정식 출시 + 성장 엔진 (Week 7-8)](#6-sprint-4-정식-출시--성장-엔진-week-7-8)
7. [데이터베이스 스키마 명세](#7-데이터베이스-스키마-명세)
8. [API 엔드포인트 명세](#8-api-엔드포인트-명세)
9. [UI/UX 수정 명세](#9-uiux-수정-명세)
10. [테스트 요구사항](#10-테스트-요구사항)
11. [검수 기준 및 품질 게이트](#11-검수-기준-및-품질-게이트)
12. [마케팅 구현 명세](#12-마케팅-구현-명세)
13. [보안 요구사항](#13-보안-요구사항)
14. [DevOps 및 배포 명세](#14-devops-및-배포-명세)
15. [리스크 관리](#15-리스크-관리)
16. [부록: 파일 구조 및 참조](#16-부록-파일-구조-및-참조)

---

## 1. 프로젝트 개요 및 현황

### 1.1 제품 정의

**DreamSync**는 꿈 일기 + AI 분석 + 컨디션 예보 + 웰니스 트래킹을 통합한 **"예측형 셀프케어"** 하이브리드 앱이다.

- **플랫폼**: React 19 PWA + Capacitor 8 (iOS/Android 네이티브)
- **카테고리**: Health & Fitness
- **타겟**: 25-35세 셀프케어/웰니스 관심층 (1차 한국 시장)
- **태그라인**: "꿈이 알려주는 내일의 나"

### 1.2 현재 완성 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Phase 1-4 코어 기능 | **100% 완성** | 꿈 기록, AI 분석, 체크인, 예보, 심볼 사전, UHS, 코치 플랜 |
| UI/UX | **90% 완성** | 34개 컴포넌트, 9개 페이지, 다크 모드 |
| 단위 테스트 | **287개 통과** | 뮤테이션 kill rate 100%, 플레이키율 0% |
| 번들 크기 | **74kB gzip** | 9개 라우트 Lazy-loaded |
| Lint | **0 errors** | ESLint 9.39 |
| Edge Function | **스켈레톤 완성** | ai-proxy, rate-limit, audit-log |

### 1.3 출시까지 해야 할 것 (이 명세서의 범위)

| 구분 | 작업 | 긴급도 |
|------|------|--------|
| **백엔드** | Supabase 통합 (DB + Auth + API) | Critical |
| **측정** | Mixpanel Analytics + Sentry 모니터링 연동 | Critical |
| **보안** | Android 암호화, npm 취약점, CORS 수정 | Critical |
| **AI** | Claude API 실제 연동 + 프롬프트 엔지니어링 | High |
| **UX** | 온보딩 리디자인, Dashboard 카드 축소, WCAG 수정 | High |
| **테스트** | E2E Playwright 5개 핵심 플로우 | High |
| **마케팅** | 앱스토어 메타데이터, 공유 기능, 바이럴 루프 | Medium |
| **CRM** | 재참여 넛지 자동화, 생애주기 추적 | Medium |

### 1.4 출시 전략

```
Phase A (Week 5): PWA 소프트 런칭
  - Mock AI + 로컬 스토리지 + Mixpanel/Sentry 연동 완료
  - 얼리어답터 200-500명 대상
  - ProductHunt 런칭

Phase B (Week 8): 앱스토어 정식 출시
  - Supabase 통합 + Edge AI + 보안 패치 완료
  - iOS App Store + Google Play
  - Launch Readiness Gate 5단계 통과 필수
```

---

## 2. 기술 스택 및 아키텍처

### 2.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| Vite | 7.2 | 빌드 도구 |
| Tailwind CSS | 4 | 스타일링 |
| Zustand | - | 상태관리 (persist with Capacitor Preferences) |
| Zod | - | AI 응답 스키마 검증 |
| React Router DOM | - | 라우팅 |
| Capacitor | 8 | 네이티브 브릿지 (iOS/Android) |
| date-fns | - | 날짜 유틸리티 |
| Lucide React | - | 아이콘 |

### 2.2 백엔드 (구축 대상)

| 기술 | 용도 |
|------|------|
| Supabase | BaaS (Auth + PostgreSQL + Edge Functions + Storage) |
| Deno | Edge Function 런타임 |
| Redis/KV | Rate Limiting 상태 저장 (Supabase KV 또는 외부 Redis) |

### 2.3 외부 서비스

| 서비스 | 용도 | 계정 필요 |
|--------|------|-----------|
| Supabase | 백엔드 | 새 프로젝트 생성 필요 |
| Anthropic (Claude) | AI 꿈 분석/예보 | API Key 필요 |
| Mixpanel | 사용자 행동 분석 | 프로젝트 생성 필요 |
| Sentry | 에러 모니터링 | 프로젝트 생성 필요 |
| Vercel | 웹 배포 | 이미 설정됨 |

### 2.4 핵심 아키텍처 패턴 (반드시 준수)

#### Adapter 패턴

**절대 주석 처리로 "나중에 연동" 하지 않는다.** 인터페이스를 고정하고 구현체를 분리하며, 환경변수로 런타임 선택한다.

```
환경변수 → Adapter 선택 → 런타임 전환

VITE_AI=mock|edge         → MockAIAdapter | EdgeAIAdapter
VITE_BACKEND=local|supabase → LocalAdapter | SupabaseAdapter
VITE_ANALYTICS=mock|mixpanel → MockAnalytics | MixpanelAdapter
VITE_FLAGS=local|remote   → LocalFlags | RemoteFlags
```

**파일 위치**:
- `src/lib/adapters/ai/` — AI 어댑터
- `src/lib/adapters/storage.js` — 저장소 어댑터
- `src/lib/adapters/analytics.js` — 분석 어댑터
- `src/lib/adapters/api.js` — API 어댑터

#### WearableProvider 패턴

```
IWearableProvider 인터페이스
  → MockWearableProvider (개발/테스트)
  → HealthKitProvider (iOS)
  → HealthConnectProvider (Android)
```

#### Edge Function 프록시 패턴

```
클라이언트 → Bearer Token → Edge Function → Anthropic API
                                ↓
                          ANTHROPIC_API_KEY는 서버에만 존재
```

**핵심 보안 원칙**: 클라이언트에 LLM API Key 절대 노출 금지

#### UHS 주의사항

```
의료/진단/치료 표현 절대 금지
→ "참고 지표", "웰니스 상태" 등 사용
→ UHS_DISCLAIMER 상수 고정 사용
```

---

## 3. Sprint 1: 측정 + 보안 기반 (Week 1-2)

> **목표**: 모든 의사결정의 전제인 Analytics/Monitoring을 먼저 연동하고, 보안 긴급 패치를 완료한다.

### 3.1 [TASK-S1-01] Mixpanel 실제 연동

**우선순위**: P0 (Critical)
**담당**: Frontend + Growth
**소요 예상**: 5일
**의존성**: 없음

#### 상세 명세

1. **Mixpanel 프로젝트 생성**
   - 프로젝트명: `dreamsync-production`
   - 환경: Production / Development 2개 프로젝트 분리
   - Token을 환경변수 `VITE_MIXPANEL_TOKEN`으로 관리

2. **기존 Mock Analytics 어댑터를 Mixpanel 실제 연동으로 전환**

   **파일**: `src/lib/adapters/analytics.js`

   현재 Mock 어댑터 구조:
   ```javascript
   // 현재 Mock 구현
   export const MockAnalytics = {
     track: (event, props) => { /* console.log only */ },
     identify: (userId) => { /* noop */ },
     setUserProperties: (props) => { /* noop */ },
   };
   ```

   Mixpanel 어댑터 추가:
   ```javascript
   // 추가할 MixpanelAdapter
   import mixpanel from 'mixpanel-browser';

   export const MixpanelAdapter = {
     init: () => {
       mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
         debug: import.meta.env.DEV,
         track_pageview: true,
         persistence: 'localStorage',
       });
     },
     track: (event, props) => mixpanel.track(event, props),
     identify: (userId) => mixpanel.identify(userId),
     setUserProperties: (props) => mixpanel.people.set(props),
   };
   ```

   환경변수로 전환:
   ```javascript
   export function getAnalyticsAdapter() {
     if (import.meta.env.VITE_ANALYTICS === 'mixpanel') {
       return MixpanelAdapter;
     }
     return MockAnalytics;
   }
   ```

3. **핵심 이벤트 20개 삽입**

   | 이벤트명 | 발생 시점 | 필수 속성 | 삽입 위치 |
   |----------|----------|-----------|-----------|
   | `app_open` | 앱 시작 | `platform`, `version` | `App.jsx` |
   | `auth_signup` | 회원가입 완료 | `method` (email/guest) | `useAuthStore.signUp()` |
   | `auth_login` | 로그인 | `method` | `useAuthStore.signIn()` |
   | `auth_logout` | 로그아웃 | - | `useAuthStore.signOut()` |
   | `onboarding_step` | 온보딩 각 단계 | `step` (1-4) | `Onboarding.jsx` |
   | `onboarding_complete` | 온보딩 완료 | `duration_sec` | `Onboarding.jsx` |
   | `onboarding_skip` | 온보딩 스킵 | `step` | `Onboarding.jsx` |
   | `dream_create_start` | 꿈 기록 시작 | `input_method` (text/voice) | `DreamCapture.jsx` |
   | `dream_create_complete` | 꿈 기록 완료 | `content_length`, `has_voice` | `useDreamStore.addDream()` |
   | `dream_analysis_complete` | AI 분석 완료 | `symbols_count`, `emotions_count` | `useDreamStore.analyzeDream()` |
   | `checkin_start` | 체크인 시작 | - | `CheckIn.jsx` |
   | `checkin_step` | 체크인 각 단계 | `step` (1-4), `duration_sec` | `CheckIn.jsx` |
   | `checkin_complete` | 체크인 완료 | `total_duration_sec` | `useCheckInStore.addLog()` |
   | `checkin_abandon` | 체크인 중도 이탈 | `abandoned_step` | `CheckIn.jsx` (뒤로가기/나감) |
   | `forecast_view` | 예보 확인 | `confidence` | `Dashboard.jsx` |
   | `forecast_feedback` | 예보 검증 | `was_accurate` (boolean) | `useForecastStore` |
   | `report_view` | 주간 리포트 조회 | `week` | `WeeklyReport.jsx` |
   | `report_share` | 리포트 공유 | `share_method` | `WeeklyReport.jsx` |
   | `notification_click` | 알림 클릭 | `notification_type` | `useNotifications` |
   | `settings_change` | 설정 변경 | `setting_key`, `new_value` | `Settings.jsx` |

4. **사용자 속성 (People Properties)**

   | 속성 | 설정 시점 | 값 |
   |------|----------|-----|
   | `$name` | 회원가입 | 사용자 이름 |
   | `$email` | 회원가입 | 이메일 |
   | `signup_date` | 회원가입 | ISO 날짜 |
   | `platform` | 앱 시작 | `web` / `ios` / `android` |
   | `onboarding_completed` | 온보딩 완료 | boolean |
   | `total_dreams` | 꿈 기록 시 | 누적 카운트 |
   | `total_checkins` | 체크인 시 | 누적 카운트 |
   | `current_streak` | 체크인 시 | 현재 연속일수 |
   | `lifecycle_stage` | 단계 전환 시 | `L0`~`L5` |

#### 인수 기준 (Acceptance Criteria)

- [ ] `VITE_ANALYTICS=mixpanel` 시 Mixpanel에 이벤트가 실제 전송됨
- [ ] `VITE_ANALYTICS=mock` 시 기존 동작과 동일 (콘솔 출력만)
- [ ] 20개 핵심 이벤트가 해당 시점에 정확히 발생
- [ ] Mixpanel 대시보드에서 이벤트/속성 확인 가능
- [ ] 기존 287개 테스트 전부 통과 (회귀 없음)

---

### 3.2 [TASK-S1-02] Sentry 에러 모니터링 연동

**우선순위**: P0 (Critical)
**담당**: DevOps + Frontend
**소요 예상**: 3일
**의존성**: 없음

#### 상세 명세

1. **Sentry 프로젝트 생성**
   - Platform: React (JavaScript)
   - Environment: `production`, `staging`, `development`

2. **SDK 설치 및 초기화**

   ```bash
   npm install @sentry/react
   ```

   **파일**: `src/main.jsx` (앱 진입점)
   ```javascript
   import * as Sentry from '@sentry/react';

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     release: `dreamsync@${import.meta.env.VITE_APP_VERSION || '0.0.1'}`,
     tracesSampleRate: 0.1, // 프로덕션에서 10% 샘플링
     replaysSessionSampleRate: 0.01,
     replaysOnErrorSampleRate: 1.0,
     beforeSend(event) {
       // PII 필터링: 꿈 내용 마스킹
       if (event.extra?.dreamContent) {
         event.extra.dreamContent = '[REDACTED]';
       }
       return event;
     },
   });
   ```

3. **ErrorBoundary 연동**

   **파일**: `src/components/common/ErrorBoundary.jsx` (기존 파일 수정)
   - 기존 ErrorBoundary에 Sentry.captureException 추가
   - componentDidCatch에서 Sentry로 에러 전송

4. **React Router 연동**

   **파일**: `src/Router.jsx`
   ```javascript
   import { wrapCreateBrowserRouter } from '@sentry/react';
   // 기존 createBrowserRouter를 래핑
   ```

5. **Edge Function 에러 전송**
   - `supabase/functions/ai-proxy/index.ts`에서 catch 블록에 Sentry 전송 로직 추가
   - 단, Edge Function은 Deno 환경이므로 `@sentry/deno` 또는 HTTP API 사용

6. **소스맵 업로드**

   **파일**: `vite.config.js`
   ```javascript
   import { sentryVitePlugin } from '@sentry/vite-plugin';
   // build.sourcemap = true 설정
   // Sentry 토큰으로 자동 업로드
   ```

#### 인수 기준

- [ ] 프론트엔드 JavaScript 에러가 Sentry에 수집됨
- [ ] 사용자 ID가 Sentry 이벤트에 포함됨
- [ ] 꿈 내용 등 민감 데이터가 Sentry에 전송되지 않음 (beforeSend 필터)
- [ ] 소스맵이 업로드되어 에러 스택트레이스에 원본 코드 표시
- [ ] Sentry 알림 설정 (Slack/Email)

---

### 3.3 [TASK-S1-03] npm 취약점 해결

**우선순위**: P0 (Critical)
**담당**: DevOps
**소요 예상**: 1일
**의존성**: 없음

#### 상세 명세

현재 `npm audit` 결과: High 12개, Moderate 1개

```
@eslint/config-array, @eslint/eslintrc, @isaacs/brace-expansion,
@surma/rollup-plugin-off-main-thread, ajv, ejs, eslint, filelist,
jake, minimatch, tar, vite-plugin-pwa, workbox-build
```

**작업 순서**:

1. 런타임 영향 패키지 먼저 업데이트:
   ```bash
   npm update ajv
   ```

2. 개발 종속성 업데이트:
   ```bash
   npm update --save-dev
   npm audit fix --audit-level=high
   ```

3. 자동 패치 불가 시 수동 해결:
   - `package.json`의 `overrides` 필드 사용
   - 대체 패키지 검토

4. 검증:
   ```bash
   npm audit --omit=dev    # 운영 환경 위험 확인
   npm run verify           # 회귀 테스트
   ```

#### 인수 기준

- [ ] `npm audit` High 취약점 0개
- [ ] `npm run verify` (lint + typecheck + build + test) 통과
- [ ] 기능 회귀 없음

---

### 3.4 [TASK-S1-04] Android Encrypted SharedPreferences

**우선순위**: P0 (Critical)
**담당**: Frontend (모바일)
**소요 예상**: 1일
**의존성**: 없음

#### 상세 명세

**현재 문제**: Android SharedPreferences가 평문 저장 → 기기 탈취 시 꿈 기록/사용자 정보 노출

**수정 대상 파일**: `src/lib/adapters/storage.js`

**작업**:

1. Android 플랫폼 감지 시 Encrypted SharedPreferences 사용

   ```javascript
   // Capacitor 네이티브 플러그인 옵션
   // @capacitor/preferences는 내부적으로 SharedPreferences 사용
   // Android에서 EncryptedSharedPreferences로 래핑 필요
   ```

2. **방법 A (권장)**: Capacitor 커스텀 플러그인으로 EncryptedSharedPreferences 래핑
   - `android/app/build.gradle.kts`에 `androidx.security:security-crypto` 추가
   - Capacitor 플러그인 or 기존 Preferences 플러그인 포크

3. **방법 B (대안)**: 웹 레이어에서 AES-GCM 암호화 후 Preferences에 저장
   - `crypto.subtle.encrypt` / `crypto.subtle.decrypt` 사용
   - 암호화 키는 기기 고유값에서 PBKDF2로 파생

4. **마이그레이션**: 기존 평문 데이터 → 암호화 데이터 자동 변환
   - 앱 시작 시 평문 데이터 감지 → 암호화 → 기존 키 삭제

#### 인수 기준

- [ ] Android에서 Capacitor Preferences 데이터가 암호화되어 저장됨
- [ ] 기존 평문 데이터가 앱 업데이트 시 자동 마이그레이션됨
- [ ] iOS 동작에 영향 없음 (iOS는 이미 Keychain으로 보호)
- [ ] 웹 환경 동작에 영향 없음

---

### 3.5 [TASK-S1-05] CORS ALLOWED_ORIGINS 수정

**우선순위**: P0 (Critical)
**담당**: Backend
**소요 예상**: 15분
**의존성**: 없음

#### 상세 명세

**파일**: `supabase/functions/ai-proxy/index.ts` 줄 27-37

**현재 문제**: `ALLOWED_ORIGINS` 미설정 시 `Access-Control-Allow-Origin: *` (와일드카드)

**수정**:

```typescript
// 변경 전
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

// 변경 후
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'null')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

// ALLOWED_ORIGINS에 와일드카드 포함 시 에러
if (ALLOWED_ORIGINS.includes('*')) {
  console.error('[SECURITY] ALLOWED_ORIGINS must not include wildcard');
}
```

**Supabase Secrets 설정**:
```
ALLOWED_ORIGINS=https://dreamsync-app.vercel.app,capacitor://localhost,http://localhost:5173
```

#### 인수 기준

- [ ] `ALLOWED_ORIGINS` 미설정 시 모든 origin 거부됨
- [ ] 허용 origin에서만 API 호출 가능
- [ ] Capacitor 앱에서 정상 동작 (`capacitor://localhost`)

---

### 3.6 [TASK-S1-06] WCAG 접근성 수정

**우선순위**: P1 (High)
**담당**: Frontend
**소요 예상**: 2일
**의존성**: 없음

#### 상세 명세

1. **text-secondary 명암비 수정**

   **파일**: `src/index.css`

   ```css
   /* 변경 전 */
   --text-secondary: #a0a0b0;   /* 명암비 3.8:1 — WCAG AA 미달 */

   /* 변경 후 */
   --text-secondary: #b5b5c5;   /* 명암비 4.5:1 이상 — WCAG AA 충족 */
   ```

   **검증**: Chrome DevTools > Accessibility > Contrast Ratio 확인

2. **focus-visible 스타일 추가**

   **파일**: `src/index.css`

   ```css
   /* 추가 */
   *:focus-visible {
     outline: 2px solid var(--color-primary);
     outline-offset: 2px;
     border-radius: 4px;
   }
   ```

3. **Button 컴포넌트 focus 스타일**

   **파일**: `src/components/common/Button.jsx`
   - `focus-visible:ring-2 focus-visible:ring-primary` 클래스 추가

4. **aria-label 누락 보완**
   - 아이콘 전용 버튼에 `aria-label` 추가 (DreamCard 삭제 버튼, BottomNav 아이콘 등)

#### 인수 기준

- [ ] text-secondary 명암비 WCAG AA (4.5:1) 충족
- [ ] 키보드 탭 이동 시 포커스 링이 모든 인터랙티브 요소에 표시
- [ ] Lighthouse Accessibility 점수 90 이상
- [ ] 아이콘 전용 버튼에 aria-label 존재

---

### 3.7 Sprint 1 검수 체크리스트

| # | 검수 항목 | 통과 기준 |
|---|----------|----------|
| 1 | Mixpanel 이벤트 | 20개 이벤트 Mixpanel 대시보드에서 확인 |
| 2 | Sentry 에러 수집 | 의도적 에러 발생 시 Sentry에 캡처됨 |
| 3 | npm audit | `npm audit --omit=dev` High 0개 |
| 4 | Android 암호화 | adb로 SharedPreferences 파일 확인 시 암호화됨 |
| 5 | CORS | 미허용 origin에서 API 호출 시 403 |
| 6 | WCAG | Lighthouse Accessibility 90+ |
| 7 | 회귀 테스트 | `npm run verify` 통과 (287+ 테스트) |
| 8 | Flaky Guard | `npm run test:repeat` 3회 0 실패 |

---

## 4. Sprint 2: 백엔드 + AI + 온보딩 (Week 3-4)

> **목표**: Supabase 백엔드 통합, Claude AI 실제 연동, 온보딩 UX 개선, E2E 테스트 구축

### 4.1 [TASK-S2-01] Supabase 프로젝트 설정 + 스키마 생성

**우선순위**: P0 (Critical)
**담당**: Backend
**소요 예상**: 3일
**의존성**: 없음

#### 상세 명세

1. **Supabase 프로젝트 생성**
   - Region: Northeast Asia (ap-northeast-1) — 한국 사용자 기준
   - Plan: Free → 사용량에 따라 Pro 전환

2. **7개 테이블 생성** (아래 [섹션 7](#7-데이터베이스-스키마-명세) 참조)
   - `users`, `dreams`, `daily_logs`, `symbols`, `forecasts`, `sleep_records`, `audit_logs`

3. **RLS (Row Level Security) 정책 설정** — 모든 테이블
   - 사용자는 자신의 데이터만 SELECT/INSERT/UPDATE/DELETE 가능
   - `auth.uid() = user_id` 조건

4. **인덱스 생성**
   - 각 테이블의 `(user_id, date DESC)` 복합 인덱스
   - `symbols` 테이블의 `(user_id, name)` 인덱스

5. **Supabase Auth 설정**
   - Email/Password 인증 활성화
   - Guest 로그인 (Anonymous sign-in) 활성화
   - JWT 만료 시간: 1시간
   - Refresh Token 활성화

6. **환경변수 설정**

   ```bash
   # .env.local (클라이언트)
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<프로젝트-anon-key>

   # Supabase Secrets (서버 전용)
   LLM_API_KEY → Supabase Secrets 설정
   SUPABASE_JWT_SECRET=...
   ALLOWED_ORIGINS=https://dreamsync-app.vercel.app,capacitor://localhost
   ```

#### 인수 기준

- [ ] 7개 테이블이 Supabase 대시보드에서 확인됨
- [ ] RLS 정책이 모든 테이블에 활성화됨
- [ ] 다른 사용자의 데이터 접근 시 빈 결과 반환 (RLS 검증)
- [ ] Supabase Auth로 회원가입/로그인/로그아웃 동작
- [ ] JWT 만료 후 Refresh Token으로 자동 갱신

---

### 4.2 [TASK-S2-02] Supabase API Adapter 구현

**우선순위**: P0 (Critical)
**담당**: Backend + Frontend
**소요 예상**: 5일
**의존성**: TASK-S2-01

#### 상세 명세

**파일**: `src/lib/adapters/api.js` (기존 파일 수정)

1. **Supabase 클라이언트 초기화**

   신규 파일: `src/lib/supabase.js`
   ```javascript
   import { createClient } from '@supabase/supabase-js';

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY,
   );
   ```

2. **SupabaseAPIAdapter 구현**

   각 엔티티별 CRUD:

   | 엔티티 | 메서드 | Supabase 쿼리 |
   |--------|--------|--------------|
   | Dream | `create(userId, data)` | `supabase.from('dreams').insert(...)` |
   | Dream | `list(userId, limit, offset)` | `.select().eq('user_id').order('date', desc).range(...)` |
   | Dream | `update(id, data)` | `.update().eq('id', id).eq('user_id', userId)` |
   | Dream | `delete(id)` | `.delete().eq('id', id).eq('user_id', userId)` |
   | CheckIn | `create(userId, data)` | `.upsert({ user_id, date, ... })` |
   | CheckIn | `listByRange(userId, start, end)` | `.select().gte('date', start).lte('date', end)` |
   | Forecast | `create(userId, data)` | `.insert(...)` |
   | Forecast | `getByDate(userId, date)` | `.select().eq('date', date).single()` |
   | Symbol | `upsert(userId, data)` | `.upsert(...)` |
   | Symbol | `list(userId)` | `.select().eq('user_id', userId)` |
   | SleepRecord | `upsert(userId, data)` | `.upsert({ user_id, date, source, ... })` |

3. **환경변수 전환**

   ```javascript
   export function getAPIAdapter() {
     if (import.meta.env.VITE_BACKEND === 'supabase') {
       return SupabaseAPIAdapter;
     }
     return LocalAPIAdapter; // 기존 Zustand persist
   }
   ```

4. **Auth Store 수정**

   **파일**: `src/store/useAuthStore.js`

   - `VITE_BACKEND=supabase` 시:
     - `signUp()` → `supabase.auth.signUp()`
     - `signIn()` → `supabase.auth.signInWithPassword()`
     - `signOut()` → `supabase.auth.signOut()`
     - `guestLogin()` → `supabase.auth.signInAnonymously()`
   - `VITE_BACKEND=local` 시: 기존 로컬 인증 유지

5. **세션 관리**

   **파일**: `src/App.jsx`
   ```javascript
   // Supabase 세션 리스너
   useEffect(() => {
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         if (event === 'SIGNED_IN') { /* 로그인 처리 */ }
         if (event === 'SIGNED_OUT') { /* 로그아웃 처리 */ }
         if (event === 'TOKEN_REFRESHED') { /* 토큰 갱신 */ }
       }
     );
     return () => subscription.unsubscribe();
   }, []);
   ```

#### 인수 기준

- [ ] `VITE_BACKEND=supabase` 시 모든 CRUD가 Supabase DB에 저장됨
- [ ] `VITE_BACKEND=local` 시 기존 동작 그대로 유지
- [ ] Supabase Auth로 가입 → 로그인 → 데이터 저장 → 로그아웃 → 재로그인 플로우 정상
- [ ] 페이지네이션 동작 (꿈 목록 50개씩 로드)
- [ ] 오프라인 모드에서 syncQueue에 저장 후 온라인 복귀 시 동기화

---

### 4.3 [TASK-S2-03] Edge AI Claude 연동 + 프롬프트 v1

**우선순위**: P1 (High)
**담당**: AI/ML + Backend
**소요 예상**: 5일
**의존성**: TASK-S1-05 (CORS 수정)

#### 상세 명세

1. **ai-proxy Edge Function 수정**

   **파일**: `supabase/functions/ai-proxy/index.ts`

   `handleAnalyzeDream()` 함수를 실제 Claude API 호출로 교체:

   ```typescript
   async function handleAnalyzeDream(payload: { content: string }, userId: string) {
     const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
     if (!apiKey) {
       return { error: { code: 'AI_UNAVAILABLE', message: 'API key not configured' } };
     }

     const response = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey,
         'anthropic-version': '2023-06-01',
       },
       body: JSON.stringify({
         model: 'claude-sonnet-4-6',
         max_tokens: 1024,
         system: ANALYZE_DREAM_SYSTEM_PROMPT,
         messages: [{ role: 'user', content: buildAnalyzeDreamUserPrompt(payload.content) }],
       }),
     });
     // ... 응답 파싱 + 스키마 검증
   }
   ```

2. **프롬프트 설계 (한국어)**

   **꿈 분석 시스템 프롬프트**:
   ```
   당신은 경험이 풍부한 꿈 분석가입니다.
   사용자의 꿈을 분석하여 심리학적 통찰을 제공합니다.

   지침:
   1. 심볼 추출 (1-10개): Jung 원형론 + 개인 문맥 고려
   2. 감정 인식 (1-5개): 텍스트 정서 강도 (1-10)
   3. 테마 식별 (1-5개): "변화", "관계", "두려움" 등
   4. 강도 평가 (1-10): 감정 총 강도 정규화
   5. 해석 생성: 100-500자 심리학적 해석
   6. 행동 제안: 1개 구체적 추천 행동

   반드시 JSON 형식으로 응답하세요.
   의료/진단/치료 표현을 절대 사용하지 마세요.
   "참고 지표" 수준의 표현만 사용하세요.

   출력 스키마:
   {
     "symbols": [{ "name": string, "meaning": string, "frequency": 1 }],
     "emotions": [{ "name": string, "intensity": 1-10 }],
     "themes": [string],
     "intensity": 1-10,
     "interpretation": string,
     "actionSuggestion": string
   }
   ```

   **예보 생성 시스템 프롬프트**:
   ```
   당신은 웰니스 트렌드 분석가입니다.
   최근 데이터를 바탕으로 오늘의 컨디션을 예측합니다.

   입력 데이터:
   - 최근 꿈 분석 결과 (감정/강도/테마)
   - 최근 체크인 데이터 (컨디션/스트레스)
   - 수면 데이터 (시간/품질)

   분석 프로세스:
   1. 꿈 강도 추세 식별
   2. 스트레스/감정 패턴 분석
   3. 수면 품질 상관관계 확인
   4. 종합 컨디션 예측 (1-5)

   반드시 JSON 형식으로 응답하세요.

   출력 스키마:
   {
     "condition": 1-5,
     "confidence": 0-100,
     "summary": string (10-300자),
     "risks": [string] (0-3개),
     "suggestions": [string] (1-4개)
   }
   ```

3. **응답 검증**

   Edge Function과 클라이언트 모두에서 Zod 스키마로 이중 검증:
   - Edge Function: `validateAnalysisResponse()`
   - 클라이언트: `DreamAnalysisSchema.safeParse()`

4. **Fallback 정책**

   - Claude API 에러 → Mock AI fallback (최대 5회)
   - 429 (Rate Limit) → fallback 안 함 (서버 정책 존중)
   - 네트워크 에러 → Mock fallback + 사용자 토스트 알림

5. **비용 관리**

   - 모델: `claude-sonnet-4-6` (비용 효율적)
   - max_tokens: 1024 (꿈 분석), 512 (예보)
   - Rate Limit: 분당 10회, 일당 100회 유지

#### 인수 기준

- [ ] `VITE_AI=edge` 시 Claude API로 꿈 분석 결과 반환
- [ ] 분석 결과가 기존 Zod 스키마에 맞는 JSON
- [ ] 한국어 프롬프트로 한국어 분석 결과 생성
- [ ] API 에러 시 Mock fallback 동작
- [ ] 429 시 "요청 한도 초과" 토스트 표시
- [ ] Audit Log에 호출 메타데이터만 기록 (꿈 내용 미포함)

---

### 4.4 [TASK-S2-04] Rate Limit KV 스토어 전환

**우선순위**: P1 (High)
**담당**: Backend
**소요 예상**: 2일
**의존성**: TASK-S2-01

#### 상세 명세

**파일**: `supabase/functions/rate-limit/index.ts`

**현재 문제**: 인메모리 Map → Deno 콜드스타트 시 리셋

**수정**: Supabase KV 또는 PostgreSQL 사용

```typescript
// 방법 1: PostgreSQL (간단, 즉시 구현 가능)
async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const dayStart = new Date(now.toISOString().split('T')[0]);

  const { count: minuteCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', minuteAgo.toISOString());

  const { count: dayCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', dayStart.toISOString());

  if (minuteCount >= 10 || dayCount >= 100) {
    return { allowed: false, remaining: { minute: 10 - minuteCount, day: 100 - dayCount } };
  }

  // 기록
  await supabase.from('rate_limits').insert({ user_id: userId });

  return { allowed: true, remaining: { minute: 9 - minuteCount, day: 99 - dayCount } };
}
```

**추가 테이블**:
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 자동 정리 (30일 이상 데이터 삭제)
CREATE INDEX rate_limits_cleanup_idx ON rate_limits(created_at);
```

#### 인수 기준

- [ ] Edge Function 콜드스타트 후에도 Rate Limit 상태 유지
- [ ] 분당 10회 초과 시 429 응답
- [ ] 일당 100회 초과 시 429 응답
- [ ] 기존 Rate Limit 테스트 (logic.test.ts) 통과

---

### 4.5 [TASK-S2-05] 온보딩 리디자인

**우선순위**: P1 (High)
**담당**: Frontend + UX
**소요 예상**: 5일
**의존성**: TASK-S1-01 (Mixpanel)

#### 상세 명세

**파일**: `src/pages/Onboarding.jsx`

**현재**: 4단계 (환영 → 주요 기능 → 알림 설정 → 목표)

**변경**: 4단계 유지하되 내용 재구성

1. **Step 1: 환영 + 가치 제안** (기존 유지, 카피 개선)
   ```
   "꿈이 알려주는 내일의 나"
   "매일 30초, 내 무의식과 대화하세요"
   ```

2. **Step 2: 미니 체크인 체험** (신규)
   - 간단한 컨디션 슬라이더 (1-5) 직접 체험
   - "오늘 컨디션은 어떤가요?" → 결과 즉시 표시
   - **목적**: Cold Start 제거, 즉시 가치 체험

3. **Step 3: 알림 설정** (기존 유지)
   - "알림을 받으면 습관 형성 확률 3배"

4. **Step 4: 주간 목표 설정** (기존 유지)

5. **자동 샘플 데이터 로드**

   **파일**: 기존 `src/lib/utils/sampleData.js` 활용

   온보딩 완료 시:
   - 샘플 꿈 1개 + AI 분석 결과
   - 샘플 체크인 3일치
   - 샘플 예보 1개

   **목적**: Dashboard가 비어 보이지 않게 → 즉시 가치 확인

6. **Analytics 이벤트**
   - `onboarding_step` (각 단계)
   - `onboarding_complete` (duration_sec 포함)
   - `onboarding_skip` (어느 단계에서 스킵했는지)
   - `onboarding_mini_checkin` (미니 체크인 결과)

#### 인수 기준

- [ ] 4단계 온보딩 정상 동작
- [ ] 미니 체크인 체험 후 결과 표시
- [ ] 온보딩 완료 시 샘플 데이터가 Dashboard에 표시됨
- [ ] 게스트 로그인에서도 정상 동작
- [ ] Mixpanel에 온보딩 이벤트 기록됨
- [ ] 전체 소요 시간 60초 이내

---

### 4.6 [TASK-S2-06] Dashboard 카드 축소

**우선순위**: P1 (High)
**담당**: Frontend
**소요 예상**: 3일
**의존성**: TASK-S2-05

#### 상세 명세

**파일**: `src/pages/Dashboard.jsx`

**현재**: 7-8개 카드 (Forecast, CoachPlan, GoalRecovery, ForecastReview, QuickActions, Stats, RecentDreams, ...)

**변경**: 사용자 단계별 점진적 공개

1. **신규 사용자 (L0-L1, 꿈 < 3개)**:
   - Quick Actions 2개 (꿈 기록, 체크인)
   - "다음 단계" 가이드 카드
   - 최근 활동 미니 요약

2. **활성 사용자 (L2+, 꿈 >= 3개)**:
   - 오늘의 예보 카드
   - 코치 플랜
   - Quick Actions
   - 최근 꿈/체크인 요약

3. **숙련 사용자 (L3, streak 14일+)**:
   - 현재 전체 카드 표시

**구현 방법**:
```jsx
const dreamCount = useDreamStore(s => s.dreams.length);
const streak = useCheckInStore(s => s.getStreak(userId));

const dashboardLevel = dreamCount < 3 ? 'beginner'
  : streak >= 14 ? 'advanced'
  : 'active';
```

#### 인수 기준

- [ ] 신규 사용자 Dashboard에 카드 3개 이하
- [ ] 활성 사용자 Dashboard에 카드 4-5개
- [ ] 카드 수 변경이 자연스럽게 전환 (조건 충족 시)
- [ ] 기존 모든 정보는 별도 페이지/섹션에서 접근 가능

---

### 4.7 [TASK-S2-07] E2E 테스트 (Playwright) 핵심 5개 플로우

**우선순위**: P1 (High)
**담당**: QA
**소요 예상**: 5일
**의존성**: 없음

#### 상세 명세

1. **Playwright 설정**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

   **설정 파일**: `playwright.config.js`
   ```javascript
   export default {
     testDir: './e2e',
     use: {
       baseURL: 'http://localhost:5173',
       screenshot: 'only-on-failure',
       video: 'retain-on-failure',
     },
     webServer: {
       command: 'npm run dev',
       port: 5173,
     },
   };
   ```

2. **핵심 5개 E2E 플로우**

   | # | 플로우 | 파일 | 시나리오 |
   |---|--------|------|---------|
   | 1 | 회원가입 → 온보딩 | `e2e/auth-onboarding.spec.js` | 가입 → 4단계 온보딩 → Dashboard 도달 |
   | 2 | 꿈 기록 → AI 분석 | `e2e/dream-capture.spec.js` | 텍스트 입력 → 저장 → 분석 결과 확인 |
   | 3 | 체크인 4단계 | `e2e/checkin-flow.spec.js` | 컨디션 → 감정 → 스트레스 → 수면 → 완료 |
   | 4 | 주간 리포트 | `e2e/weekly-report.spec.js` | 리포트 페이지 → 차트 → 인사이트 확인 |
   | 5 | 설정 변경 | `e2e/settings.spec.js` | 알림 시간 변경 → Feature Flag 토글 |

3. **각 E2E 테스트 상세**

   **E2E-1: 회원가입 → 온보딩**
   ```
   1. /login 페이지 접속
   2. "회원가입" 링크 클릭
   3. 이메일/비밀번호/이름 입력 → "가입" 클릭
   4. 온보딩 Step 1 표시 확인
   5. "다음" 클릭 × 3회
   6. 온보딩 Step 4 완료 → Dashboard 리디렉트
   7. Dashboard에 환영 메시지 표시 확인
   ```

   **E2E-2: 꿈 기록 → AI 분석**
   ```
   1. Dashboard에서 "꿈 기록" 클릭
   2. 텍스트 입력: "바다에서 수영하는 꿈을 꿨다"
   3. "저장" 클릭
   4. AI 분석 로딩 표시
   5. 분석 결과: 심볼(바다, 수영), 감정, 해석 표시 확인
   6. 심볼 태그 클릭 시 심볼 사전으로 이동
   ```

   **E2E-3: 체크인 4단계**
   ```
   1. Dashboard에서 "체크인" 클릭
   2. Step 1: 컨디션 슬라이더 3 선택 → "다음"
   3. Step 2: 감정 2개 선택 → "다음"
   4. Step 3: 스트레스 조절 → "다음"
   5. Step 4: 수면 정보 입력 → "완료"
   6. 완료 화면 표시 → Dashboard 복귀
   7. Dashboard 통계에 반영 확인
   ```

4. **CI 통합**

   `.github/workflows/ci.yml`에 E2E 작업 추가:
   ```yaml
   e2e:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - run: npm ci
       - run: npx playwright install --with-deps
       - run: npx playwright test
   ```

#### 인수 기준

- [ ] 5개 E2E 테스트 모두 통과
- [ ] CI에서 E2E 테스트 자동 실행
- [ ] 실패 시 스크린샷 + 비디오 아티팩트 저장
- [ ] 로컬 `npx playwright test` 실행 가능

---

### 4.8 [TASK-S2-08] Staging 환경 배포 파이프라인

**우선순위**: P1 (High)
**담당**: DevOps
**소요 예상**: 2일
**의존성**: TASK-S2-01

#### 상세 명세

1. **환경 분리**

   | 환경 | URL | Supabase | AI |
   |------|-----|----------|-----|
   | Development | localhost:5173 | 로컬 | mock |
   | Staging | staging.dreamsync-app.vercel.app | Supabase (staging) | edge |
   | Production | dreamsync-app.vercel.app | Supabase (production) | edge |

2. **Vercel 환경변수 설정**

   Staging 전용 환경변수:
   ```
   VITE_BACKEND=supabase
   VITE_AI=edge
   VITE_ANALYTICS=mixpanel
   VITE_SUPABASE_URL=<staging-url>
   VITE_SUPABASE_ANON_KEY=<staging-key>
   VITE_SENTRY_DSN=<staging-dsn>
   VITE_MIXPANEL_TOKEN=<staging-token>
   ```

3. **GitHub 브랜치 전략**

   ```
   main          → Production (자동 배포)
   staging       → Staging (자동 배포)
   feature/*     → Preview (PR 배포)
   ```

4. **CI 워크플로우 수정**

   - `staging` 브랜치 push 시 Staging 환경 자동 배포
   - Staging 배포 후 E2E 테스트 자동 실행

#### 인수 기준

- [ ] Staging URL에서 앱 정상 동작
- [ ] Staging은 Supabase staging 프로젝트에 연결
- [ ] Production은 별도 Supabase 프로젝트에 연결
- [ ] 환경변수가 환경별로 분리됨

---

### 4.9 Sprint 2 검수 체크리스트

| # | 검수 항목 | 통과 기준 |
|---|----------|----------|
| 1 | Supabase 스키마 | 7개 테이블 + RLS 동작 확인 |
| 2 | Auth 플로우 | 가입 → 로그인 → JWT 갱신 → 로그아웃 |
| 3 | CRUD 동작 | 꿈/체크인/예보/심볼 Supabase 저장/조회 |
| 4 | Claude AI | `VITE_AI=edge` 시 실제 분석 결과 반환 |
| 5 | Rate Limit | 콜드스타트 후에도 제한 유지 |
| 6 | 온보딩 | 4단계 완료, 샘플 데이터 표시 |
| 7 | Dashboard | 단계별 카드 표시 확인 |
| 8 | E2E 테스트 | 5개 플로우 통과 |
| 9 | Staging | Staging URL에서 전체 동작 |
| 10 | 회귀 | `npm run verify` 통과 (287+ 테스트) |

---

## 5. Sprint 3: PWA 소프트 런칭 + 데이터 수집 (Week 5-6)

> **목표**: PWA 소프트 런칭, 마케팅 준비, 알림 개인화, 바이럴 기반 구축

### 5.1 [TASK-S3-01] Privacy Policy 작성

**우선순위**: P0 (Critical — 앱스토어 필수)
**담당**: PM + Legal
**소요 예상**: 2일

- 한국어 + 영어 버전
- 수집 데이터 명시: 꿈 내용, 감정, 수면 데이터, 사용 통계
- 제3자 제공: Anthropic (AI 분석), Mixpanel (사용 통계), Sentry (에러)
- 삭제 요청 절차
- 웹 페이지로 호스팅 (`/privacy`)

### 5.2 [TASK-S3-02] 앱스토어 메타데이터 준비

**우선순위**: P0 (Critical)
**담당**: PMM + Design
**소요 예상**: 5일

| 항목 | iOS App Store | Google Play |
|------|--------------|-------------|
| **앱 이름** | DreamSync - 꿈 분석 & 예보 | DreamSync: AI 꿈 일기 & 컨디션 예보 |
| **부제목** | 꿈에서 시작하는 셀프케어 | 꿈 기록 + AI 분석 + 컨디션 예보 |
| **카테고리** | Health & Fitness / Lifestyle | Health & Fitness / Personalization |
| **키워드** | 꿈일기,꿈해석,AI분석,수면,셀프케어,컨디션,웰니스,감정일기,꿈사전,예보 | (설명 내 키워드) |
| **스크린샷** | 5장 (6.7" + 6.1") | 5장 + Feature Graphic |
| **프리뷰 영상** | 15-30초 | 15-30초 |

**스크린샷 구성** (5장):
1. 대시보드 (예보 카드) — "오늘의 컨디션, AI가 예측합니다"
2. 꿈 기록 + AI 분석 결과 — "꿈을 기록하면 AI가 감정과 심볼을 분석"
3. 30초 체크인 플로우 — "30초 체크인으로 하루를 마무리"
4. 주간 리포트 — "일주일의 패턴이 한눈에"
5. 심볼 사전 — "나만의 꿈 사전을 만들어보세요"

### 5.3 [TASK-S3-03] 알림 개인화 Phase 1

**우선순위**: P2 (Medium)
**담당**: Frontend + CRM
**소요 예상**: 3일

**파일**: `src/hooks/useNotifications.js`

**현재**: 정적 메시지 3종 (아침/저녁/주간)
**변경**: 동적 변수 삽입

```javascript
// 아침 알림 (꿈 기록)
const morningMessages = [
  '어젯밤 꿈을 기억하시나요? 🌙',
  `${streak}일째 기록 중! 오늘도 꿈을 남겨보세요`,
  '새로운 심볼이 발견될지도 몰라요',
];

// 저녁 알림 (체크인)
const eveningMessages = [
  '오늘 하루는 어땠나요?',
  `${userName}님, 30초만 투자하면 내일이 보여요`,
  '체크인하면 내일 예보가 더 정확해져요',
];
```

- `streak`, `userName`, `lastSymbol` 등 동적 변수 사용
- 메시지 풀에서 랜덤 선택

### 5.4 [TASK-S3-04] ProductHunt 런칭 준비

**우선순위**: P1 (High)
**담당**: PMM
**소요 예상**: 3일

1. **ProductHunt 프로필 설정**
   - 제품 등록 (Upcoming)
   - 태그라인: "AI-powered dream journal that predicts your tomorrow"
   - Topics: AI, Sleep, Wellness, Mental Health, Self Care

2. **Maker 댓글 준비**
   - 제품 소개 + 개발 스토리
   - 기술 스택 소개
   - 무료 제공 혜택

3. **헌터 섭외** (가능 시)

4. **런칭일 결정**: Sprint 3 Week 5 초 (화~목 추천)

### 5.5 [TASK-S3-05] 스트릭 마일스톤 축하

**우선순위**: P2 (Medium)
**담당**: Frontend + Growth
**소요 예상**: 1일

**파일**: `src/pages/Dashboard.jsx`

체크인 완료 시 마일스톤 도달하면 축하 토스트:

| 마일스톤 | 메시지 | 이모지 |
|----------|--------|--------|
| 3일 연속 | "3일 연속 기록! 좋은 시작이에요" | - |
| 7일 연속 | "1주일 완성! 습관이 되어가고 있어요" | - |
| 14일 연속 | "2주 연속! 대단해요" | - |
| 30일 연속 | "한 달! 진정한 셀프케어 마스터" | - |

```javascript
const milestones = [3, 7, 14, 30, 60, 100];
const streak = useCheckInStore(s => s.getStreak(userId));

useEffect(() => {
  if (milestones.includes(streak)) {
    addToast({ type: 'success', message: getMilestoneMessage(streak) });
    analytics.track('streak_milestone', { days: streak });
  }
}, [streak]);
```

### 5.6 Sprint 3 검수 체크리스트

| # | 검수 항목 | 통과 기준 |
|---|----------|----------|
| 1 | Privacy Policy | URL 접근 가능, 한국어/영어 |
| 2 | 앱스토어 메타데이터 | 스크린샷 5장, 설명, 키워드 |
| 3 | PWA 배포 | dreamsync-app.vercel.app 정상 동작 |
| 4 | 알림 개인화 | 동적 메시지 표시 확인 |
| 5 | 스트릭 축하 | 3일/7일 마일스톤 토스트 표시 |
| 6 | ProductHunt | 제품 페이지 생성 완료 |

---

## 6. Sprint 4: 정식 출시 + 성장 엔진 (Week 7-8)

> **목표**: Supabase API 완성, 공유 기능, 재참여 넛지, Launch Readiness Gate 통과

### 6.1 [TASK-S4-01] 공유 카드 이미지 생성

**우선순위**: P1 (High)
**담당**: Frontend + Design
**소요 예상**: 5일

1. **주간 리포트 공유 카드**
   - Canvas/SVG로 공유용 이미지 생성
   - 포함 내용: 주간 컨디션 그래프, 주요 심볼, 요약 문장
   - 브랜드 워터마크 ("DreamSync" 로고)
   - 공유 방법: `navigator.share()` → 카카오톡/인스타 스토리

2. **꿈 분석 공유 카드**
   - AI 분석 결과 요약 + 심볼 이미지
   - 개인 민감 정보 제외 (꿈 원문 미포함)

3. **딥링크 연동**
   - 공유 카드에 앱 다운로드 링크 포함
   - `https://dreamsync-app.vercel.app/shared?ref=<userId>`

### 6.2 [TASK-S4-02] 재참여 넛지 자동화

**우선순위**: P1 (High)
**담당**: Frontend + CRM
**소요 예상**: 3일

**신규 파일**: `src/store/useLifecycleStore.js`

1. **비활동 일수 추적**

   ```javascript
   const useLifecycleStore = create(persist((set, get) => ({
     lastActiveDate: null,
     lifecycleStage: 'L0',

     updateActivity: () => {
       set({ lastActiveDate: getTodayString() });
       // 생애주기 단계 자동 업데이트
     },

     getInactiveDays: () => {
       const last = get().lastActiveDate;
       if (!last) return 999;
       return daysBetween(last, getTodayString());
     },
   })));
   ```

2. **차등 넛지 알림**

   | 비활동 일수 | 알림 유형 | 메시지 |
   |------------|----------|--------|
   | 3일 | 부드러운 넛지 | "며칠 안 보이셨네요. 오늘 꿈은 어땠나요?" |
   | 7일 | 가치 리마인더 | "{userName}님, 지난주 패턴이 궁금하지 않으세요?" |
   | 14일+ | 윈백 | "새로운 기능이 추가되었어요. 다시 시작해볼까요?" |

3. **구현 방법**: Capacitor Local Notifications 스케줄링
   - 매일 앱 시작 시 비활동 일수 확인
   - 3일/7일/14일 도달 시 다음 날 알림 예약

### 6.3 [TASK-S4-03] Launch Readiness Gate

**우선순위**: P0 (Critical)
**담당**: 전체
**소요 예상**: 5일 (전 항목 통과까지)

**5단계 게이트**:

| Gate | 시점 | 항목 | 통과 기준 |
|------|------|------|----------|
| **Gate 1** | D-21 | 보안 | npm 취약점 0, Android 암호화 완료, JWT 구현 |
| **Gate 2** | D-14 | 품질 | E2E 5개 통과, Sentry 연동, 에러율 < 1% |
| **Gate 3** | D-7 | 배포 | 환경 분리 완료, 롤백 절차 문서화, CI green |
| **Gate 4** | D-3 | 마케팅 | 앱스토어 메타데이터, 스크린샷, Privacy Policy |
| **Gate 5** | D-Day | Go/No-Go | 전 게이트 100%, Staging 24시간 무장애 |

**자동화 스크립트**: `scripts/release-gate.sh` (기존 파일 활용)

```bash
./scripts/release-gate.sh --repeat 3
# 1. npm run verify
# 2. Secret scan (grep sk-ant)
# 3. PII scan
# 4. Feature flag check
# 5. N-repeat test
```

### 6.4 Sprint 4 검수 체크리스트

| # | 검수 항목 | 통과 기준 |
|---|----------|----------|
| 1 | 공유 카드 | 이미지 생성 + 공유 동작 |
| 2 | 재참여 넛지 | 3일/7일/14일 알림 확인 |
| 3 | Lifecycle Store | 비활동 일수 정확히 계산 |
| 4 | Gate 1-5 | 전 항목 통과 |
| 5 | Staging 안정성 | 24시간 무장애 |
| 6 | 앱스토어 제출 | iOS/Android 심사 제출 |

---

## 7. 데이터베이스 스키마 명세

### 7.1 테이블 설계

```sql
-- 1. Users (Supabase Auth 보조 테이블)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dreams
CREATE TABLE dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  voice_url TEXT,
  analysis JSONB,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX dreams_user_date_idx ON dreams(user_id, date DESC);

-- 3. Daily Logs (체크인)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  condition INT CHECK (condition BETWEEN 1 AND 5),
  stress_level INT CHECK (stress_level BETWEEN 1 AND 5),
  emotions TEXT[] DEFAULT '{}',
  events TEXT[] DEFAULT '{}',
  sleep JSONB, -- { bedtime, wakeTime, quality, duration }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX daily_logs_user_date_idx ON daily_logs(user_id, date DESC);

-- 4. Symbols
CREATE TABLE symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  meaning TEXT,
  personal_meaning TEXT,
  frequency INT DEFAULT 1,
  color TEXT,
  emotion TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX symbols_user_name_idx ON symbols(user_id, name);

-- 5. Forecasts
CREATE TABLE forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prediction JSONB NOT NULL, -- { condition, confidence, summary, risks, suggestions }
  actual_condition INT,
  accuracy FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX forecasts_user_date_idx ON forecasts(user_id, date DESC);

-- 6. Sleep Records
CREATE TABLE sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'healthkit', 'health_connect')),
  duration INT, -- 분
  latency INT, -- 분
  deep_sleep INT, -- 분
  quality INT CHECK (quality BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, source)
);
CREATE INDEX sleep_records_user_date_idx ON sleep_records(user_id, date DESC);

-- 7. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  content_hash TEXT,
  content_length INT,
  latency_ms INT,
  success BOOLEAN DEFAULT true,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX audit_logs_user_created_idx ON audit_logs(user_id, created_at DESC);

-- 8. Rate Limits (Sprint 2 추가)
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX rate_limits_user_created_idx ON rate_limits(user_id, created_at);
```

### 7.2 RLS 정책 (모든 테이블 동일 패턴)

```sql
-- dreams 테이블 예시 (다른 테이블도 동일)
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dreams"
  ON dreams FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dreams"
  ON dreams FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dreams"
  ON dreams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dreams"
  ON dreams FOR DELETE USING (auth.uid() = user_id);

-- audit_logs는 INSERT만 허용 (수정/삭제 불가)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT USING (auth.uid() = user_id);
```

---

## 8. API 엔드포인트 명세

### 8.1 Edge Function: ai-proxy

| 메서드 | 경로 | 요청 | 응답 | 인증 |
|--------|------|------|------|------|
| POST | `/functions/v1/ai-proxy` | `{ type: "analyzeDream", payload: { content } }` | `DreamAnalysis` JSON | Bearer Token |
| POST | `/functions/v1/ai-proxy` | `{ type: "generateForecast", payload: { recentDreams, recentCheckIns } }` | `ForecastPrediction` JSON | Bearer Token |

**에러 코드**:
| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | VALIDATION_ERROR | 요청 스키마 미일치 |
| 401 | AUTH_REQUIRED | 토큰 없음 |
| 401 | AUTH_INVALID | 토큰 무효 |
| 403 | CORS_FORBIDDEN | Origin 미허용 |
| 429 | AI_RATE_LIMIT | 분당/일당 초과 |
| 500 | SERVER_ERROR | 서버 내부 에러 |
| 500 | AI_PARSE_ERROR | AI 응답 파싱 실패 |

### 8.2 Supabase REST API (자동 생성)

Supabase PostgREST가 자동으로 REST API 생성:

| 작업 | HTTP | 경로 |
|------|------|------|
| 꿈 목록 | GET | `/rest/v1/dreams?user_id=eq.{uid}&order=date.desc&limit=50` |
| 꿈 생성 | POST | `/rest/v1/dreams` |
| 꿈 수정 | PATCH | `/rest/v1/dreams?id=eq.{id}` |
| 체크인 생성 | POST | `/rest/v1/daily_logs` (UPSERT) |
| 체크인 범위 | GET | `/rest/v1/daily_logs?date=gte.{start}&date=lte.{end}` |
| 심볼 목록 | GET | `/rest/v1/symbols?user_id=eq.{uid}` |
| 예보 조회 | GET | `/rest/v1/forecasts?date=eq.{date}&user_id=eq.{uid}` |

---

## 9. UI/UX 수정 명세

### 9.1 색상 수정

| 변수 | 현재 값 | 변경 값 | 사유 |
|------|---------|---------|------|
| `--text-secondary` | `#a0a0b0` | `#b5b5c5` | WCAG AA 명암비 |

### 9.2 Dashboard 레이아웃 변경

| 사용자 단계 | 표시 카드 | 숨김 카드 |
|------------|----------|----------|
| 초보 (L0-L1) | Quick Actions (2개), 다음 단계 가이드 | Forecast, Coach, UHS, 통계 |
| 활성 (L2) | Forecast, Coach Plan, Quick Actions, 최근 활동 | UHS, GoalRecovery |
| 숙련 (L3) | 전체 카드 | 없음 |

### 9.3 온보딩 변경

| 단계 | 변경 전 | 변경 후 |
|------|---------|---------|
| 1 | 환영 | 환영 + 가치 제안 (카피 개선) |
| 2 | 주요 기능 소개 | **미니 체크인 체험** (직접 참여) |
| 3 | 알림 설정 | 알림 설정 (유지) |
| 4 | 목표 설정 | 목표 설정 + **샘플 데이터 로드** |

---

## 10. 테스트 요구사항

### 10.1 단위 테스트

| 요구 | 기준 |
|------|------|
| 기존 테스트 유지 | 287개 이상 통과 |
| 신규 기능 테스트 | 신규 코드 80% 커버리지 |
| 플레이키율 | 3회 반복 시 0% |

### 10.2 E2E 테스트

5개 핵심 플로우 (Sprint 2 TASK-S2-07 참조)

### 10.3 보안 테스트

- npm audit High 0개
- Bundle secret scan (`grep -rE 'sk-ant' dist/`) → 0 hits
- PII leak scan → 0 patterns
- Feature flag-off smoke test

### 10.4 성능 테스트

| 지표 | 목표 |
|------|------|
| Lighthouse Performance | 90+ |
| Lighthouse Accessibility | 90+ |
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle Size (gzip) | < 100kB |

### 10.5 디바이스 테스트 매트릭스

| 플랫폼 | 디바이스/버전 |
|--------|-------------|
| iOS | iPhone 14 (iOS 17), iPhone 12 (iOS 16) |
| Android | Pixel 7 (Android 14), Galaxy S23 (Android 13), Galaxy A54 (Android 12) |
| Web | Chrome 최신, Safari 최신, Firefox 최신, Samsung Internet, Edge |

---

## 11. 검수 기준 및 품질 게이트

### 11.1 Sprint별 검수

각 Sprint 마지막에 해당 Sprint 검수 체크리스트 전 항목 통과 필수.

### 11.2 최종 릴리스 게이트

| # | 게이트 | 자동화 | 통과 기준 |
|---|--------|--------|----------|
| 1 | `npm run verify` | CI | lint + typecheck + build + test 통과 |
| 2 | Secret Scan | `scripts/release-gate.sh` | 번들에 API Key 0개 |
| 3 | PII Scan | `scripts/release-gate.sh` | 민감 데이터 노출 0개 |
| 4 | Feature Flag Check | `scripts/release-gate.sh` | flag-off 시 크래시 없음 |
| 5 | E2E Test | Playwright CI | 5개 플로우 통과 |
| 6 | N-Repeat Test | `npm run test:repeat` | 3회 반복 0 실패 |
| 7 | Lighthouse | 수동 | Performance 90+, Accessibility 90+ |
| 8 | npm audit | 수동 | High 0개 |
| 9 | Staging 안정성 | 수동 | 24시간 무장애 |
| 10 | Privacy Policy | 수동 | URL 접근 가능 |

### 11.3 버그 심각도 분류

| 등급 | 정의 | SLA |
|------|------|-----|
| **P0 Critical** | 앱 크래시, 데이터 손실, 보안 취약 | 4시간 내 수정 |
| **P1 High** | 핵심 기능 미동작 (꿈 기록, 체크인, AI 분석) | 24시간 내 수정 |
| **P2 Medium** | UI 깨짐, 비핵심 기능 미동작 | Sprint 내 수정 |
| **P3 Low** | 오타, 미세 UX, 개선 제안 | 백로그 |

---

## 12. 마케팅 구현 명세

### 12.1 Analytics 이벤트 구현 (Sprint 1)

[TASK-S1-01] 참조 — 20개 핵심 이벤트

### 12.2 앱스토어 최적화 (Sprint 3)

[TASK-S3-02] 참조

### 12.3 공유 기능 (Sprint 4)

[TASK-S4-01] 참조

### 12.4 바이럴 루프 구조

```
사용자 꿈 분석 완료
    ↓
"공유하기" 버튼 → 공유 카드 이미지 생성
    ↓
카카오톡/인스타그램 스토리 공유
    ↓
딥링크 포함 (https://dreamsync-app.vercel.app/shared?ref=xxx)
    ↓
새 사용자 유입 → 회원가입 시 referrer 기록
    ↓
추천인에게 보상 (Phase B 이후: 프리미엄 1주)
```

### 12.5 가격 체계 (Sprint 4 이후)

| 플랜 | 가격 | 기능 제한 |
|------|------|----------|
| Free | ₩0 | 꿈 월 10개, AI 분석 월 5회, 예보 없음 |
| Premium 월간 | ₩7,900/월 | 무제한 + 예보 + 코치 + UHS |
| Premium 연간 | ₩59,000/년 | 38% 할인 |
| 평생 | ₩149,000 | 얼리어답터 한정 |

---

## 13. 보안 요구사항

### 13.1 필수 보안 항목

| # | 항목 | Sprint | 상세 |
|---|------|--------|------|
| 1 | Android 암호화 | S1 | Encrypted SharedPreferences |
| 2 | npm 취약점 | S1 | High 0개 |
| 3 | CORS 수정 | S1 | 와일드카드 제거 |
| 4 | JWT 검증 | S2 | Supabase Auth JWT 로컬 검증 |
| 5 | Rate Limit KV | S2 | 인메모리 → 영구 스토리지 |
| 6 | PII 마스킹 | 기존 | audit-log 민감 필드 strip 유지 |
| 7 | API Key 보호 | 기존 | 서버 전용, 번들 노출 0 유지 |

### 13.2 금지 사항

- `ANTHROPIC_API_KEY`에 `VITE_` 접두사 사용 금지
- 꿈 원문을 audit-log에 저장 금지
- `dangerouslySetInnerHTML`, `eval()`, `innerHTML` 사용 금지
- `.env` 파일 커밋 금지
- 의료/진단/치료 표현 사용 금지 (UHS 관련)

### 13.3 OWASP Top 10 체크

| # | 위협 | 현재 | 목표 |
|---|------|------|------|
| A01 | Broken Access Control | 부분 | JWT + RLS 완성 |
| A02 | Cryptographic Failures | 취약 | Android 암호화 완료 |
| A03 | Injection | 안전 | Zod 검증 유지 |
| A04 | Insecure Design | 부분 | Rate Limit KV 전환 |
| A05 | Security Misconfiguration | 부분 | CORS 수정 |
| A06 | Vulnerable Components | 주의 | npm audit 0 |
| A07 | Authentication Failures | 부분 | Supabase Auth + MFA |
| A09 | Logging & Monitoring | 기초 | Sentry + Audit Log |

---

## 14. DevOps 및 배포 명세

### 14.1 환경 구성

| 환경 | URL | Branch | VITE_BACKEND | VITE_AI |
|------|-----|--------|-------------|---------|
| Dev | localhost:5173 | feature/* | local | mock |
| Staging | staging.dreamsync-app.vercel.app | staging | supabase | edge |
| Production | dreamsync-app.vercel.app | main | supabase | edge |

### 14.2 CI/CD 파이프라인

```
Push/PR → GitHub Actions
  ├─ Job: verify (Ubuntu)
  │   ├─ npm ci
  │   ├─ npm run lint
  │   ├─ npm run typecheck
  │   ├─ npm run build
  │   ├─ npm run test
  │   └─ npm run test:repeat (3회)
  │
  ├─ Job: edge-functions (Deno)
  │   ├─ Rate Limit Tests
  │   └─ Audit Log Tests
  │
  └─ Job: e2e (Playwright)
      └─ 5개 핵심 플로우 테스트
```

### 14.3 릴리스 프로세스

1. Feature branch에서 개발
2. PR 생성 → CI 자동 실행
3. 코드 리뷰 → 승인
4. `staging` 브랜치에 merge → Staging 자동 배포
5. Staging 검증 (24시간)
6. `main` 브랜치에 merge → Production 자동 배포
7. `release-gate.sh` 실행 → 전 게이트 통과 확인

### 14.4 롤백 절차

1. Vercel 대시보드에서 이전 배포로 즉시 롤백
2. Supabase 마이그레이션은 별도 down 스크립트 준비
3. 롤백 후 Sentry 에러 모니터링

### 14.5 자주 쓰는 명령어

```bash
npm run dev          # 로컬 개발 서버 (http://localhost:5173)
npm run build        # 프로덕션 빌드 (dist/)
npm run verify       # lint + typecheck + build + test
npm run test:repeat  # 3회 반복 테스트 (플레이키 검출)
npm run cap:sync     # Capacitor 동기화
npm run cap:ios      # iOS Xcode 열기
npm run cap:android  # Android Studio 열기
npx playwright test  # E2E 테스트
```

---

## 15. 리스크 관리

### 15.1 리스크 매트릭스

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Supabase 통합 지연 | 중 | 높음 | Phase A를 로컬 모드로 소프트 런칭 |
| Edge AI 응답 지연 | 중 | 중간 | Mock fallback 유지, 15초 타임아웃 |
| 앱스토어 리뷰 반려 | 낮 | 높음 | Privacy Policy 사전 준비, WCAG 수정 |
| Android 보안 취약점 | 낮 | 높음 | Sprint 1에서 즉시 패치 |
| 웨어러블 권한 거부 | 높 | 낮음 | 수동 입력 폴백 이미 구현 |
| 알림 권한 거부 (iOS) | 중 | 중간 | 온보딩에서 가치 먼저 체험 |
| AI 비용 초과 | 중 | 중간 | Rate Limit + Mock fallback |

### 15.2 에스컬레이션 기준

| 상황 | 에스컬레이션 |
|------|-------------|
| P0 버그 발견 | 즉시 개발팀 리드 + 발주자 보고 |
| Sprint 목표 50% 미달 | 주간 리뷰에서 스코프 조정 |
| 보안 취약점 발견 | 즉시 보안 패치 + 발주자 보고 |
| 앱스토어 반려 | 반려 사유 분석 후 24시간 내 대응 |

---

## 16. 부록: 파일 구조 및 참조

### 16.1 주요 파일 위치

| 구분 | 경로 | 설명 |
|------|------|------|
| 앱 진입점 | `src/main.jsx` | React 앱 마운트 |
| 라우터 | `src/Router.jsx` | 라우트 정의 (9개 페이지) |
| 공통 컴포넌트 | `src/components/common/` | Button, Card, Modal 등 9개 |
| 페이지 | `src/pages/` | Dashboard, DreamCapture 등 9개 |
| Zustand 스토어 | `src/store/` | 7개 스토어 |
| 어댑터 | `src/lib/adapters/` | AI, API, Analytics, Storage |
| AI 시스템 | `src/lib/ai/` | 스키마, Mock, 서비스 |
| Edge Functions | `supabase/functions/` | ai-proxy, rate-limit, audit-log |
| 테스트 | 각 모듈 옆 `.test.js` | 287개 테스트 |
| CI 설정 | `.github/workflows/ci.yml` | GitHub Actions |
| 릴리스 게이트 | `scripts/release-gate.sh` | 5단계 자동 검증 |

### 16.2 환경변수 체크리스트

```bash
# 클라이언트 (.env.local)
VITE_BACKEND=local|supabase
VITE_AI=mock|edge
VITE_ANALYTICS=mock|mixpanel
VITE_FLAGS=local|remote
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<프로젝트-anon-key>
VITE_SENTRY_DSN=<센트리-DSN-URL>
VITE_MIXPANEL_TOKEN=...
VITE_EDGE_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/ai-proxy

# 서버 전용 (Supabase Secrets — 클라이언트 접근 금지)
LLM_API_KEY → Supabase Secrets 설정
SUPABASE_JWT_SECRET=...
ALLOWED_ORIGINS=https://dreamsync-app.vercel.app,capacitor://localhost
RATE_LIMIT_SHARED_SECRET=...
AUDIT_LOG_SHARED_SECRET=...
```

### 16.3 참조 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| 프로젝트 메모리 | `CLAUDE.md` | 프로젝트 전체 컨텍스트 |
| 최종 팀 보고서 | `reports/FINAL_TEAM_REPORT.md` | 12팀 종합 분석 + 로드맵 |
| 백엔드 아키텍처 | `BACKEND_ARCHITECTURE_REPORT.md` | DB 스키마, API, 마이그레이션 |
| 보안 감사 | `SECURITY_AUDIT_REPORT.md` | OWASP Top 10, 취약점 |
| 마케팅 전략 | `reports/product-marketing-strategy.md` | 포지셔닝, ASO, GTM |
| CRM 전략 | `beta-test/reports/crm-lifecycle-report.md` | 생애주기, 알림, 리텐션 |
| 디바이스 테스트 | `TESTPLAN_DEVICE_MATRIX.md` | 26개 시나리오 |
| 릴리스 게이트 | `HARDENING_GATE.md` | 릴리스 체크리스트 |

### 16.4 커밋 컨벤션

```
feat: 새 기능
fix: 버그 수정
refactor: 리팩토링
test: 테스트 추가/수정
docs: 문서
chore: 빌드/설정
security: 보안 패치

예시:
feat: add Mixpanel analytics adapter
fix: resolve Android SharedPreferences encryption
test: add E2E tests for dream capture flow
security: patch npm audit high vulnerabilities
```

---

## 작업 우선순위 요약 (전체 타임라인)

| Week | Sprint | 핵심 작업 | 완료 조건 |
|------|--------|----------|----------|
| 1 | S1 | Mixpanel + Sentry + npm 패치 + Android 암호화 | Analytics/모니터링 동작 |
| 2 | S1 | CORS 수정 + WCAG + Sprint 1 검수 | Sprint 1 체크리스트 통과 |
| 3 | S2 | Supabase 스키마 + Auth + API Adapter | DB + 인증 동작 |
| 4 | S2 | Claude AI 연동 + 온보딩 + E2E + Staging | Sprint 2 체크리스트 통과 |
| 5 | S3 | **Phase A: PWA 소프트 런칭** + ProductHunt | 200명 사용자 확보 |
| 6 | S3 | 데이터 수집 + 앱스토어 메타데이터 | 기준선 데이터 확보 |
| 7 | S4 | 공유 기능 + 재참여 넛지 + Gate 통과 | Gate 1-5 통과 |
| 8 | S4 | **Phase B: 앱스토어 정식 출시** | iOS + Android 심사 통과 |

---

*이 명세서는 DreamSync 프로젝트 12개 전문 팀의 분석 보고서와 3개 크로스 펑셔널 그룹 토론 결과를 기반으로 작성되었습니다.*

**최종 작성**: 2026-02-21
**다음 리뷰**: Sprint 1 완료 시 (Week 2)
**문의**: 프로젝트 오너에게 연락
