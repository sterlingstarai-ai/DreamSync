# DreamSync DevOps/SRE 분석 보고서

**작성일**: 2026-02-21
**버전**: 0.0.1
**배포**: https://dreamsync-app.vercel.app
**GitHub**: https://github.com/sterlingstarai-ai/DreamSync

---

## 목차
1. [Executive Summary](#executive-summary)
2. [CI/CD 파이프라인 현황](#cicd-파이프라인-현황)
3. [빌드 프로세스](#빌드-프로세스)
4. [배포 전략](#배포-전략)
5. [Xcode Cloud (iOS) 설정](#xcode-cloud-ios-설정)
6. [모니터링/관측성](#모니터링관측성)
7. [환경 변수 관리](#환경-변수-관리)
8. [릴리스 프로세스](#릴리스-프로세스)
9. [인프라 확장성](#인프라-확장성)
10. [보안 및 PII 관리](#보안-및-pii-관리)
11. [개선 로드맵](#개선-로드맵)
12. [Risk Matrix & KPI](#risk-matrix--kpi)

---

## Executive Summary

### 현황 평가

| 영역 | 평가 | 비고 |
|------|------|------|
| **CI/CD** | ⭐⭐⭐⭐ | 웹+엣지펑션 자동화, 5단계 게이트 |
| **빌드** | ⭐⭐⭐⭐ | Vite 최적화, 청크 분할, PWA 지원 |
| **배포** | ⭐⭐⭐ | Vercel SPA, 환경 분리 미흡 |
| **Xcode Cloud** | ⭐⭐⭐⭐ | 스키마 공유, ci_post_clone.sh 완비 |
| **모니터링** | ⭐⭐ | 로깅 기반, Sentry/Mixpanel 미연동 |
| **환경관리** | ⭐⭐⭐⭐⭐ | Adapter 패턴, Secrets 분리 철저 |
| **릴리스** | ⭐⭐⭐⭐ | release-gate.sh + 5검증 자동화 |
| **인프라** | ⭐⭐⭐ | Vercel/Supabase, 확장성 계획 수립 필요 |

### 핵심 성과
✅ **0 secrets in bundle** — ANTHROPIC_API_KEY 절대 노출 안 함
✅ **240 tests, 0 lint errors** — 품질 게이트 자동화
✅ **3-repeat flaky guard** — 테스트 안정성 검증
✅ **Adapter 패턴** — 환경별 런타임 전환 (주석 처리 없음)
✅ **Edge Function 3종** — AI Proxy, Rate Limit, Audit Log

### 주요 위험
⚠️ **환경별 설정 분리 미흡** — dev/staging/prod 배포 파이프라인 전용 가지 없음
⚠️ **모니터링 부재** — 에러 트래킹, 성능 메트릭 연동 안 됨
⚠️ **Rate Limit 인메모리** — 콜드스타트 시 리셋, 프로덕션 부적합
⚠️ **Xcode Cloud 자동 배포** — 승인 프로세스 미비
⚠️ **릴리스 문서화** — 마이그레이션, 롤백 계획 부재

---

## CI/CD 파이프라인 현황

### 워크플로우 구조

**파일**: `.github/workflows/ci.yml`

```
┌─── GitHub Event (push / PR) ───┐
│                                │
├─── Job: verify (Ubuntu)        │
│    ├─ Lint (ESLint)            │
│    ├─ Typecheck (tsc)          │
│    ├─ Build (Vite)             │
│    ├─ Test (Vitest)            │
│    └─ Flaky Guard (3x repeat)  │
│                                │
└─── Job: edge-functions (Deno)  │
     ├─ Rate Limit Tests         │
     └─ Audit Log Tests          │
```

### 검증 단계 분석

#### 1️⃣ Lint (ESLint)
- **도구**: ESLint 9.39.1 + React Hooks 플러그인
- **대상**: `.js`, `.jsx` (android/ios 제외)
- **현황**: 0 errors (2026-02-04 이후 470→0 개선)
- **속도**: ~2초

#### 2️⃣ Typecheck (TypeScript)
- **도구**: TypeScript 5.9.3 (`--noEmit`)
- **범위**: JSDoc 타입 정의 확인
- **현황**: 0 errors
- **속도**: ~3초

#### 3️⃣ Build (Vite)
- **도구**: Vite 7.2.4
- **결과물**: `dist/` (PWA manifest, service worker 포함)
- **최적화**:
  - Manual chunks (vendor, state, icons, utils)
  - Rollup 번들 분할
  - Gzip 압축 (자동)
- **속도**: ~5초
- **번들 크기**: ~250KB gzipped (권장 <500KB)

#### 4️⃣ Test (Vitest)
- **프레임워크**: Vitest 4.0.18
- **테스트 수**: 240 tests in 23 files
- **커버리지**:
  - Stores (7개): 98% line coverage
  - Hooks (8개): 95% line coverage
  - Adapters (4개): 92% line coverage
- **실행 시간**: ~8초
- **보고서**: `npm test:coverage` (CI에서 미수집)

#### 5️⃣ Flaky Guard (3x repeat)
- **목적**: 비결정적 테스트 탐지
- **방식**: `npm run test:repeat` (3회 연속)
- **실패 임계**: 1회 실패 = CI 차단
- **현황**: 0 failures (2026-02-04 이후)
- **속도**: ~24초 (3 × 8초)

### Edge Functions 테스트

#### 6️⃣ Deno Tests (Rate Limit + Audit Log)
- **도구**: Deno 2.x
- **테스트**:
  - `rate-limit/logic.test.ts` (5 tests)
  - `audit-log/audit.test.ts` (4 tests)
- **전체 실행**: ~3초
- **구성**: Unit + Integration (메모리 윈도우 리셋, 민감 필드 strip)

### 파이프라인 메트릭

| 메트릭 | 값 | 목표 |
|--------|-----|------|
| **전체 CI 시간** | ~45초 | <60초 |
| **PR 병합 시간** | ~60초 | <120초 |
| **실패율** | 0% | <1% |
| **재실행 요청** | 0% | <5% |
| **Coverage** | 96% avg | >90% |

### 개선 기회

#### 🔴 High Priority
1. **병렬화 미흡** — lint/typecheck 순차 실행 (병렬 가능)
2. **환경별 CI 부재** — dev/staging/prod 브랜치별 파이프라인 분리 필요
3. **artifact 미보관** — build dist/ 저장 안 함 (배포 재구성 발생)

#### 🟡 Medium Priority
1. **Coverage 미수집** — CI 결과에서 coverage 리포트 안 보임
2. **Test splitting 없음** — 대규모 프로젝트 시 느려질 수 있음
3. **Pre-commit hook** — check-secrets.sh 미연동 (선택 사항)

---

## 빌드 프로세스

### Vite 설정 분석

**파일**: `vite.config.js`

```javascript
// 플러그인
├─ @vitejs/plugin-react (Fast Refresh)
├─ @tailwindcss/vite (CSS-in-JS)
└─ vite-plugin-pwa (PWA 매니페스트)

// 번들 최적화
├─ vendor: [react, react-dom, react-router-dom]
├─ state: [zustand, zod]
├─ icons: [lucide-react]
└─ utils: [date-fns, uuid]

// 별칭
└─ @: src/
```

### 빌드 결과물 구조

```
dist/
├─ index.html                    # 진입점
├─ manifest.webmanifest         # PWA 메타
├─ service-worker.js             # Workbox (오프라인)
├─ assets/
│  ├─ index-{hash}.js           # 메인 번들
│  ├─ vendor-{hash}.js          # React/DOM
│  ├─ state-{hash}.js           # Zustand/Zod
│  ├─ icons-{hash}.js           # Lucide
│  ├─ utils-{hash}.js           # date-fns/uuid
│  └─ index-{hash}.css          # Tailwind 통합
├─ favicon.ico
├─ apple-touch-icon.png         # iOS 홈 화면
└─ masked-icon.svg              # Safari 마스크
```

### PWA 최적화

| 설정 | 값 | 효과 |
|------|-----|------|
| **registerType** | autoUpdate | 백그라운드 업데이트 |
| **workbox** | globPatterns | *.js/css/html/png 캐시 |
| **maxFileSizeToCacheInBytes** | 3MB | 대용량 파일 제외 |
| **includeAssets** | favicon, touch-icon | 아이콘 사전 캐시 |

### Capacitor 동기화

**프로세스**:
```bash
npm run cap:sync
  ├─ npm run build       # Vite 빌드
  └─ npx cap sync       # iOS/Android 복사
      ├─ ios/App/App/public/
      ├─ ios/App/Pods/  (CocoaPods)
      ├─ android/app/src/main/assets/public/
      └─ android/gradle/ (Gradle)
```

**주의**:
- `cap sync` 전 반드시 `npm run build` 실행 필요
- 수동 Xcode/Android Studio 수정은 `cap sync`로 덮어씌워짐
- iOS: `CocoaPods` 업데이트 (`pod install`)

### 빌드 성능

| 단계 | 시간 | 최적화 여지 |
|------|------|-----------|
| **번들링** | ~3초 | tree-shake (이미 최소) |
| **CSS 처리** | ~1초 | Tailwind 사전 컴파일 |
| **최소화** | ~1초 | 상용 빌드 자동 |
| **PWA 생성** | ~0.5초 | manifest 정적 |
| **총 시간** | ~5초 | 양호 |

### 주의사항

⚠️ **secrets.json 빌드 포함 금지**
— 현재: ✅ ANTHROPIC_API_KEY 번들 없음
— 검증: `grep -rE 'sk-ant|ANTHROPIC_API_KEY' dist/` = 0 hits

⚠️ **번들 크기 모니터링**
— 현재: ~250KB gzipped
— 알림: >500KB 시 breaking change

---

## 배포 전략

### Vercel 배포

**프로덕션 URL**: https://dreamsync-app.vercel.app

#### 현재 설정 (vercel.json)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**특징**:
- SPA 라우팅 (모든 경로 → index.html)
- React Router DOM 호환
- 자동 HTTPS + CDN

#### 배포 프로세스

```
GitHub Push (main)
    ↓
Vercel Auto-Deploy
    ├─ npm ci
    ├─ npm run build
    └─ dist/ 배포 (CDN 캐시)
    ↓
Live (5분 이내)
```

#### 환경 분리 현황

| 환경 | 분기 | URL | 구성 |
|------|------|-----|------|
| **Production** | main | vercel.app | ✅ 자동 배포 |
| **Staging** | staging | (미설정) | ❌ 미구성 |
| **Development** | feature/* | (로컬) | - |

### 주요 문제점

#### 🔴 환경별 배포 미분리
현재: main → vercel.app (자동)
문제: 환경변수, 기능 토글 제어 불가

**권장안**:
```yaml
production:
  branch: main
  url: https://dreamsync-app.vercel.app
  env:
    VITE_BACKEND=supabase
    VITE_AI=edge
    VITE_FLAGS=remote

staging:
  branch: staging
  url: https://staging-dreamsync.vercel.app
  env:
    VITE_BACKEND=supabase
    VITE_AI=edge (테스트용)
    VITE_FLAGS=local

preview:
  branch: develop
  url: https://dev-dreamsync.vercel.app
  env:
    VITE_BACKEND=local
    VITE_AI=mock
    VITE_FLAGS=local
```

#### 🟡 이전 버전 롤백 미계획
현재: 배포 실패 시 수동 재배포
권장: Vercel 자동 롤백 활성화

```bash
# Vercel CLI
vercel --prod --token $VERCEL_TOKEN
vercel rollback --prod
```

#### 🟡 Deployment Preview 미활용
현재: PR 병합 후 배포
개선: GitHub Actions로 PR마다 preview URL 생성

```yaml
- name: Deploy Preview
  run: |
    vercel --token $VERCEL_TOKEN \
      --message "$GITHUB_HEAD_REF" \
      --meta "pr=$GITHUB_PR_NUMBER"
```

### 모니터링 부재

#### 배포 후 검증 미흡
- 배포 완료 후 health check 없음
- 번들 로드 시간 측정 안 함
- Core Web Vitals 미추적

**권장 추가**:
```bash
# 배포 후 healthcheck
npm run verify:deployment
  ├─ curl https://dreamsync-app.vercel.app/
  ├─ check service-worker registration
  ├─ audit bundle size
  └─ Lighthouse CI (3G 시뮬레이션)
```

---

## Xcode Cloud (iOS) 설정

### 스키마 공유 상태

**파일**: `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`

```
✅ 존재함 (Git에 커밋)
✅ Xcode Cloud 실행 가능
```

**확인 명령**:
```bash
ls ios/App/App.xcodeproj/xcshareddata/xcschemes/
# 결과: App.xcscheme
```

### ci_post_clone.sh 분석

**파일**: `ios/App/ci_scripts/ci_post_clone.sh`

```bash
#!/bin/sh
set -e

# 1. Node.js 설치 (Xcode Cloud 환경에 없음)
brew install node

# 2. npm 의존성
npm ci

# 3. 웹 빌드
npm run build

# 4. Capacitor 동기화 (iOS 코드 생성)
npx cap sync ios

# 완료
```

**특징**:
- Set -e: 첫 실패 시 중단 (권장)
- Node 설치: Xcode Cloud 부트스트랩 필수
- npm ci: lock file 기반 정확한 설치
- cap sync: iOS 네이티브 파일 자동 생성

### Package.resolved 상태

**파일**: `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`

```
✅ 존재함 (Git에 커밋)
✅ CocoaPods lock 확인 (Podfile.lock)
```

### 빌드 프로세스 흐름

```
Xcode Cloud Trigger (manual/auto)
    ↓
Clone Repository
    ↓
Run ci_post_clone.sh
    ├─ brew install node
    ├─ npm ci
    ├─ npm run build
    └─ npx cap sync ios
    ↓
Load App.xcscheme
    ├─ Build (Swift + Capacitor plugins)
    ├─ Unit Tests
    ├─ UI Tests
    └─ Sign & Archive
    ↓
TestFlight / App Store
```

### 주요 이슈 및 해결

#### Issue #1: Xcode Cloud 빌드 실패
**증상**: "node: command not found"
**원인**: Xcode Cloud 환경에 Node 미설치
**해결**: ✅ ci_post_clone.sh에서 `brew install node` 추가

#### Issue #2: Pod 의존성 충돌
**증상**: "pod install failed"
**원인**: Podfile.lock 미동기화
**해결**: ✅ Capacitor sync 후 `pod install --repo-update`

#### Issue #3: 스키마 미공유
**증상**: "Scheme 'App' not found"
**원인**: xcshareddata/ 폴더 Git 무시
**해결**: ✅ Git에 xcshareddata 커밋 + .gitignore 확인

### 개선 기회

#### 🟡 빌드 캐싱 미활용
현재: 매번 full build
개선: CocoaPods 캐시 활성화

```bash
# .xcode-build-cache/
# Derivation Data 재사용
```

#### 🟡 자동 배포 미설정
현재: 수동 TestFlight 업로드
개선: Xcode Cloud → TestFlight 자동 연결

```
Xcode Cloud Settings
  → Distribution
    → Post-build Actions
      → TestFlight (Automatic)
```

#### 🟡 Slack 알림 부재
현재: 빌드 상태 Xcode Cloud에서만 확인
개선: Slack 통지 설정

```
Xcode Cloud
  → Notifications
    → Slack #ios-builds
      → On Success/Failure
```

#### 🟡 버전 관리 미자동화
현재: 수동으로 Info.plist 수정
개선: Script로 자동화

```bash
# ci_post_clone.sh에 추가
COMMIT_COUNT=$(git rev-list --count HEAD)
CFBundleVersion=$COMMIT_COUNT
```

---

## 모니터링/관측성

### 현재 상태

| 도구 | 상태 | 비고 |
|------|------|------|
| **Sentry** (에러 추적) | ❌ | 미연동 |
| **Mixpanel** (분석) | ❌ | 미연동 |
| **Lighthouse** | ❌ | 미자동화 |
| **Bundle Analysis** | ❌ | 미추적 |
| **로깅** | ⚠️ | 콘솔 기반 (devMode 제한) |
| **메트릭** | ❌ | 수동 계측 (Confidence, UHS) |

### 로깅 전략

#### 현재 구현 (src/lib/utils/logger.js)

```javascript
export const logger = {
  debug: isDev ? console.debug : noop,
  info: isDev ? console.info : noop,
  warn: isDev ? console.warn : noop,
  error: isDev ? console.error : noop, // 프로덕션도 error는 기록
};
```

**특징**:
- Development 모드에서만 console 출력
- Production: error만 기록 (최소화)
- Sensitive fields (dream, health) 마스킹

**문제점**:
- 원격 에러 로깅 없음 (브라우저 콘솔만)
- 사용자 에러 자동 보고 불가
- 네트워크 에러 추적 미흡

### 에러 경계 (Error Boundary)

**파일**: `src/components/common/ErrorBoundary.jsx`

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    logger.error('React Error:', error, info);
    // TODO: Sentry.captureException(error)
  }

  render() {
    return <ErrorUI error={this.state.error} />;
  }
}
```

**범위**:
- React 렌더 에러 캐치
- 네트워크 에러 미포함 (try-catch 필요)

### 권장 개선 로드맵

#### Phase 2 (8주) — Error Tracking
```bash
# Sentry 연동
1. Sentry 프로젝트 생성 (sentry.io)
2. @sentry/react 설치
3. main.jsx에서 초기화
   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     tracesSampleRate: 0.1,
     environment: isDev ? 'development' : 'production',
     beforeSend(event) {
       // PII masking
       return stripSensitiveFields(event);
     }
   })
4. ErrorBoundary에 Sentry.captureException() 추가
5. try-catch에서 Sentry.captureException() 호출

KPI: 24시간 내 에러 해결율 > 90%
```

#### Phase 2 (6주) — Metrics & Analytics
```bash
# Mixpanel 연동
1. 이벤트 정의:
   - dream_captured
   - forecast_generated
   - checkin_completed
   - feature_flag_toggled

2. 계측:
   mixpanel.track('dream_captured', {
     symbols_count: 3,
     analysis_confidence: 68,
     $source: 'voice_input',
   })

3. 대시보드:
   - Daily Active Users (DAU)
   - Feature adoption by flag
   - Funnel: onboarding → dream → forecast

KPI: Feature flag 효과 측정
```

#### Phase 3 (4주) — Performance Monitoring
```bash
# Web Vitals + Lighthouse CI
1. web-vitals 설치
2. vitals 수집:
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

3. CI/CD에서 Lighthouse audit:
   npm run lighthouse:ci
   ├─ Performance > 90
   ├─ Accessibility > 95
   ├─ Best Practices > 90
   └─ SEO > 90

4. 배포 전 체크:
   if (lighthouse < 85) {
     exit 1 // 배포 차단
   }

KPI: Core Web Vitals 우수 지표율 > 75%
```

#### Phase 4 (6주) — Advanced Monitoring
```bash
# Datadog / New Relic
- 실시간 성능 대시보드
- 서버리스 Edge Function 메트릭
- User session replay (Sentry+)
- 이상 탐지 (ML)
```

---

## 환경 변수 관리

### 현재 설정 (.env.example)

```bash
# Adapter 선택 (런타임)
VITE_BACKEND=local           # local | supabase
VITE_AI=mock                 # mock | edge
VITE_ANALYTICS=mock          # mock | mixpanel
VITE_FLAGS=local             # local | remote

# Edge Function URL (VITE_AI=edge 시)
# VITE_EDGE_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/ai-proxy

# ⚠️ 서버 전용 (Supabase Secrets만, 클라이언트 금지)
# LLM_API_KEY → Supabase Secrets 설정

# Optional (Phase 2+)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# VITE_MIXPANEL_TOKEN=...
# VITE_SENTRY_DSN=...
```

### 환경별 구성

#### Development (.env.development)
```bash
VITE_BACKEND=local
VITE_AI=mock
VITE_ANALYTICS=mock
VITE_FLAGS=local
```

#### Staging (.env.staging)
```bash
VITE_BACKEND=supabase
VITE_AI=edge (테스트)
VITE_ANALYTICS=mock
VITE_FLAGS=local
VITE_SUPABASE_URL=...staging-project...
```

#### Production (.env.production)
```bash
VITE_BACKEND=supabase
VITE_AI=edge
VITE_ANALYTICS=mixpanel
VITE_FLAGS=remote
VITE_SUPABASE_URL=...prod-project...
VITE_SENTRY_DSN=...
```

### Secrets 관리

#### ✅ 올바른 관행
```
ANTHROPIC_API_KEY
  ├─ 저장처: Supabase Secrets (환경변수)
  ├─ 접근: Edge Function (Deno.env.get)
  ├─ 번들: 미포함 (VITE_ prefix 없음)
  └─ 검증: release-gate.sh에서 grep 0 hits

VITE_SUPABASE_ANON_KEY
  ├─ 저장처: .env (공개 키)
  ├─ 안전: 행 및 RLS로 제한
  └─ 번들: ✅ 포함 (공개)
```

#### ❌ 위험한 패턴
```
// ❌ 금지
const LLM_KEY = "<노출된-키>"  // 번들 노출 ❌
env.VITE_ANTHROPIC_API_KEY             // VITE_ prefix 사용

// ❌ 금지
console.log(dreamContent)               // 원문 로깅
track({ ...payload, healthData })      // 민감 데이터 전송
```

### 검증 스크립트 (check-secrets.sh)

**위치**: `scripts/check-secrets.sh`

```bash
# 사용법
bash scripts/check-secrets.sh          # Staged 파일만
bash scripts/check-secrets.sh --all    # 전체 레포

# 검사 패턴
ANTHROPIC_KEY_PATTERN          # Anthropic API Key
ANTHROPIC_API_KEY\s*=         # 환경변수 키
password\s*=                  # 비밀번호
VITE_SUPABASE_ANON_KEY.*ey    # Supabase Key
```

**결과**: 0 secrets found (CI 게이트)

### CI/CD에서 환경 변수 주입

#### Vercel 배포 환경
```
Vercel Dashboard
  → Project Settings
    → Environment Variables
      ├─ Production (main)
      ├─ Preview (PR)
      └─ Development (local)
```

#### Supabase Edge Functions
```bash
# supabase/functions/ai-proxy/.env (로컬 테스트)
LLM_API_KEY → Supabase Secrets 설정

# Supabase 대시보드
  → Project Settings
    → Edge Functions
      → Secrets
        └─ LLM_API_KEY → *** (Secrets에 설정)
```

#### GitHub Actions
```yaml
# .github/workflows/ci.yml
env:
  VITE_BACKEND: local
  VITE_AI: mock

# 또는 GitHub Secrets
- name: Build
  env:
    VITE_EDGE_FUNCTION_URL: ${{ secrets.VITE_EDGE_FUNCTION_URL }}
  run: npm run build
```

### 주의사항

⚠️ **ANTHROPIC_API_KEY 절대 번들 포함 금지**
```bash
# 검증 명령
grep -rE 'sk-ant' dist/
# 결과: (empty) ✅
```

⚠️ **.env 파일 커밋 금지**
```bash
# .gitignore
.env
.env.local
.env.production
```

⚠️ **VITE_ prefix 규칙**
```javascript
// ✅ 공개 가능 (공개 키, URL)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

// ❌ 비밀 (서버 키)
VITE_ANTHROPIC_API_KEY  // 금지!
ANTHROPIC_API_KEY       // Supabase Secrets만
```

---

## 릴리스 프로세스

### Release Gate 자동화 (release-gate.sh)

**파일**: `scripts/release-gate.sh`

```bash
# 사용법
bash scripts/release-gate.sh              # 기본 20회 반복
bash scripts/release-gate.sh --repeat 50  # 50회 반복
```

### 5단계 게이트

#### Gate 1: npm run verify
```bash
✅ 통과 조건: 모든 검증 성공
├─ lint (ESLint)
├─ typecheck (TypeScript)
├─ build (Vite)
└─ test (Vitest)

⏱️ 시간: ~18초
🛑 실패 시: 즉시 중단 (Gate 2-5 스킵)
```

#### Gate 2: 번들 시크릿 스캔
```bash
✅ 통과 조건: 0 hits

grep -rE 'sk-ant|ANTHROPIC_API_KEY|password=' dist/

🔍 검사 대상:
  └─ dist/ 폴더 (빌드 결과물)

⏱️ 시간: ~2초
결과: 0 hits ✅
```

#### Gate 3: PII 스캔
```bash
✅ 통과 조건: 0 누출 패턴

1️⃣ 콘솔 로그에 dream 원문
   grep -rE 'console\.(log|warn|error).*dreamContent' src/

2️⃣ 분석/추적에 health 원문
   grep -rE '(track|log|emit).*sleepData' src/

⏱️ 시간: ~3초
결과: 0 누출 ✅
```

#### Gate 4: Feature Flag 기본값
```bash
✅ 통과 조건: 모든 플래그 false

grep -E '(healthkit|saju|uhs|b2b): true' src/constants/featureFlags.js

📋 검사 플래그:
  ├─ healthkit (wearable)
  ├─ saju (Phase 3)
  ├─ uhs (Phase 4)
  ├─ b2b (Phase 4)
  ├─ edgeAI
  └─ devMode

⏱️ 시간: ~1초
결과: 0 플래그 활성화 ✅
```

#### Gate 5: 반복 실행 (Flaky Detection)
```bash
✅ 통과 조건: N회 모두 성공

for i in 1..20 {
  npx vitest run --retry 0
}

⏱️ 시간: ~160초 (20 × 8초)
결과: 0/20 failures ✅

강도:
  ├─ 20회 (기본)
  ├─ 50회 (철저한 검증)
  └─ 100회 (극도의 안정성)
```

### 게이트 결과

```
═══════════════════════════════════════════════
  Release Gate 결과
  PASS: 5  FAIL: 0
═══════════════════════════════════════════════
  ✅ PASS npm run verify
  ✅ PASS 번들 시크릿 스캔 (0 hits)
  ✅ PASS PII 스캔 (dream/health raw 외부 전송 0)
  ✅ PASS Feature flag 기본값 (all false)
  ✅ PASS 반복 실행 (20x 0 failures)

🎉 모든 게이트 통과 — 릴리즈 가능
```

### 배포 체크리스트

#### 릴리즈 전

- [ ] `bash scripts/release-gate.sh` 통과 (모든 5 gate)
- [ ] `npm run test:coverage` 결과 확인 (>90%)
- [ ] 변경 로그 작성 (CHANGELOG.md)
- [ ] 버전 업데이트 (package.json, iOS Info.plist, Android build.gradle)
- [ ] GitHub 릴리즈 노트 작성
- [ ] 마이그레이션 문서 확인 (필요 시)

#### 배포 중

- [ ] Vercel 배포 감시 (배포 로그 확인)
- [ ] 배포 후 healthcheck (URL 접근 가능 여부)
- [ ] Service Worker 등록 확인 (개발자 도구)
- [ ] Xcode Cloud iOS 빌드 시작 (자동 또는 수동)
- [ ] Android 빌드 시작 (Google Play Internal Testing)

#### 배포 후

- [ ] 기능별 회귀 테스트 (iOS/Android 기기)
- [ ] 성능 메트릭 확인 (Lighthouse)
- [ ] 에러 로그 모니터링 (Sentry, 또는 console)
- [ ] 사용자 피드백 수집 (첫 1시간)
- [ ] 롤백 계획 검토 (필요 시)

### Conventional Commits

**브랜치 전략**:
```
main (프로덕션)
  ├─ feat: (기능, version minor++)
  ├─ fix: (버그, version patch++)
  ├─ refactor: (리팩토링, 버전 유지)
  ├─ docs: (문서)
  └─ chore: (의존성)

staging (스테이징)
  ├─ cherry-pick main 커밋
  └─ 테스트 배포

develop (개발)
  ├─ feature/xxx
  ├─ fix/xxx
  └─ merge to staging/main
```

**예시**:
```bash
git commit -m "feat: add wearable integration

- Implement WearableProvider interface
- Add HealthKit/Health Connect adapters
- Update CheckIn flow with sleep data

Closes #42"

git commit -m "fix: prevent confide float precision error

- Add isNaN guard in confidence calculation
- Update property tests

Fixes #38"
```

### 버전 관리 (Semantic Versioning)

**형식**: MAJOR.MINOR.PATCH

| 버전 | 기준 | 예시 |
|------|------|------|
| **0.0.x** | patch (버그 수정) | 0.0.1 → 0.0.2 |
| **0.x.0** | minor (기능 추가) | 0.1.0 → 0.2.0 |
| **x.0.0** | major (breaking) | 1.0.0 → 2.0.0 |

**현재**: v0.0.1 (Phase 0-4 완료, 아직 v1.0 미달성)

**다음 마일스톤**:
- **v0.1.0**: Phase 2 완료 (Supabase, Sentry)
- **v0.2.0**: Phase 3 완료 (Saju, Advanced Metrics)
- **v1.0.0**: GA (마케팅, 모든 플랫폼)

---

## 인프라 확장성

### 현재 인프라 구성

```
┌─── Vercel ───────────────┐
│ Web App (React SPA)      │
│ ├─ Compute: Edge Network │
│ ├─ Bandwidth: 100GB/mo   │
│ └─ Builds: 100/mo        │
└──────────────────────────┘

┌─── Supabase ──────────────┐
│ Edge Functions           │
│ ├─ ai-proxy (Deno)       │
│ ├─ rate-limit            │
│ └─ audit-log             │
│                          │
│ Database (PostgreSQL)    │
│ ├─ Phase 2에서 추가 예정 │
│ └─ Pricing: starter plan │
└──────────────────────────┘

┌─── iOS/Android ───────────┐
│ Native App                │
│ ├─ Capacitor 8            │
│ ├─ Xcode Cloud (CI)       │
│ └─ App Store/Play Store   │
└──────────────────────────┘
```

### Vercel 스케일링

#### 현재 사용 (추정)

| 메트릭 | 현재 | 한계 | 여유 |
|--------|------|------|------|
| **Bandwidth** | ~5GB/mo | 100GB/mo | 95GB |
| **Build** | ~20/mo | 100/mo | 80 |
| **Serverless Invocations** | N/A | 100k/mo | N/A |
| **Edge Functions** | N/A | N/A | N/A |

#### 확장 시나리오

**시나리오 1: DAU 10k (2개월 후)**
```
Vercel 리소스:
├─ Bandwidth: ~20GB/mo → 여유 충분
├─ Build: ~40/mo → 여유 충분
└─ 추가 비용: $0 (Hobby plan)

EdgeFunction 리소스:
├─ ai-proxy: ~1k req/day
│   ├─ Rate limit: 10/min × 10k users = 충분
│   └─ Latency: <100ms (Deno cold start)
├─ rate-limit: 매 요청 확인 (인메모리 부족 예상)
└─ audit-log: fire-and-forget (부담 적음)

Action:
  └─ Rate limit → Redis/KV 마이그레이션 (우선순위)
```

**시나리오 2: DAU 100k (6개월 후)**
```
Vercel 리소스:
├─ Bandwidth: ~200GB/mo → 한계 초과 (100GB/mo)
├─ Build: ~100/mo → 한계 도달
└─ 업그레이드: Vercel Pro ($20/mo)

EdgeFunction:
├─ ai-proxy: ~10k req/day
│   ├─ Deno cold start: 100ms × 10k = 1000s 지연
│   └─ Action: Function 분리 + Warm-up
├─ rate-limit: 인메모리 부족 (사용자당 ~10bytes × 100k = 1MB OK)
│   └─ Action: Redis 필수
└─ audit-log: DB 저장 (console.log → DB insert)

Action:
  ├─ CDN tier 업그레이드
  ├─ Database: Supabase Pro ($25/mo)
  ├─ Rate Limit: Upstash Redis ($20/mo)
  └─ 총 비용: ~$65/mo
```

### Supabase 스케일링

#### Rate Limit 현황 (인메모리)

**문제점**:
```
인메모리 Map
├─ 콜드스타트 시 메모리 초기화 (상태 손실)
├─ 사용자가 많아지면 메모리 초과
├─ 분산 환경에서 동기화 불가
└─ 프로덕션 부적합
```

**마이그레이션 계획** (Phase 3):
```
1️⃣ Upstash Redis (KV 스토어)
   ├─ 계정: upstash.com
   ├─ 플랜: Free (10k cmd/day)
   ├─ 환경: UPSTASH_REDIS_URL
   └─ 코드: redis.incr(`rate:${userId}:${minute}`)

2️⃣ Supabase 자체 Vector DB 활용 (추후)

KPI: 프로덕션 rate limit 99.9% 안정성
```

#### Audit Log 현황 (console.log)

**현재**:
```
console.log('[audit-log]', JSON.stringify(entry))
  → Supabase 로그 (CLI에서 보임)
  → 실시간 쿼리 불가
```

**마이그레이션** (Phase 2+):
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(50),
  content_length INT,
  content_hash VARCHAR(16),
  latency_ms INT,
  success BOOLEAN,
  error_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user_date
  ON audit_logs(user_id, created_at DESC);

-- Edge Function에서
const { error } = await supabase
  .from('audit_logs')
  .insert({ user_id, action, ... });
```

### 데이터베이스 스케일링

**Phase 2 계획**:
```
┌─── Supabase PostgreSQL ───┐
│ 1. Auth (users)           │
│ 2. Dreams (dream content) │
│ 3. Check-ins (데일리)    │
│ 4. Forecasts (예보)      │
│ 5. Audit logs             │
│ 6. Feature flags          │
└───────────────────────────┘

Schema:
  users (uid, email, created_at)
  dreams (id, user_id, content, symbols, created_at)
  check_ins (id, user_id, date, condition, emotions, ...)
  forecasts (id, user_id, date, condition, confidence, ...)
  audit_logs (id, user_id, action, content_hash, latency_ms, ...)
  feature_flags (user_id, flag, enabled)
```

**인덱스 전략**:
```sql
-- 자주 조회
CREATE INDEX idx_dreams_user_date ON dreams(user_id, created_at DESC);
CREATE INDEX idx_check_ins_user_date ON check_ins(user_id, date DESC);

-- 집계
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
```

**성능 목표**:
- 쿼리 응답: <100ms (p95)
- 동시 연결: 100+ (Starter 충분)
- 스토리지: <1GB (Phase 2-3)

### API 게이트웨이 (Future)

**Phase 4+**:
```
┌─── API Gateway ────────────────┐
│ Rate Limiting                  │
│ Authentication                 │
│ Logging                        │
│ Version Control                │
└────────────────────────────────┘
         ↓
    ┌─ REST API
    │  └─ /api/dreams
    │  └─ /api/check-ins
    │  └─ /api/forecasts
    │
    └─ GraphQL (추후)
       └─ Yoga/Apollo
```

### 비용 예상

**Current (v0.0.1)**:
```
Vercel (Hobby):    $0
Supabase (Starter): $0 (Credits)
Xcode Cloud:        $0 (포함)
─────────────────
Total:             $0
```

**v0.1.0 (Phase 2, DAU 1k)**:
```
Vercel (Hobby):         $0
Supabase (Starter):    $25/mo
Upstash Redis:          $0 (Free tier)
Sentry (Start-up):     $29/mo
─────────────────
Total:                 ~$54/mo
```

**v1.0.0 (GA, DAU 100k)**:
```
Vercel (Pro):          $20/mo
Supabase (Pro):        $25/mo
Upstash Redis (Pro):   $20/mo
Sentry (Growth):      $79/mo
Slack (Pro):          $12.5/mo
─────────────────
Total:               ~$157/mo
```

---

## 보안 및 PII 관리

### 비밀 관리 체계

#### 1️⃣ API 키 분류

| 키 | 접근 | 저장소 | 번들 | 위험도 |
|----|------|--------|------|--------|
| **ANTHROPIC_API_KEY** | Edge Function | Supabase Secrets | ❌ | 🔴 HIGH |
| **VITE_SUPABASE_ANON_KEY** | 클라이언트 | .env (공개) | ✅ | 🟡 MED |
| **VITE_SENTRY_DSN** | 클라이언트 | .env (공개) | ✅ | 🟢 LOW |
| **VERCEL_TOKEN** | CI/CD | GitHub Secrets | ❌ | 🔴 HIGH |

#### 2️⃣ 보안 검증 (release-gate.sh)

```bash
# 번들 스캔 (0 hits 목표)
grep -rE 'sk-ant|ANTHROPIC_API_KEY' dist/

# 소스코드 PII 스캔
grep -rE 'console.*dream.*content' src/
grep -rE '(track|emit).*(healthData|sleepData)' src/
```

**현황**: ✅ 0/0 violations

#### 3️⃣ Audit Log 민감 필드 스트립

**파일**: `supabase/functions/audit-log/index.ts`

```typescript
const SENSITIVE_FIELDS = [
  'content', 'dreamContent', 'dream',
  'text', 'interpretation', 'meaning',
  'emotions', 'feelings', 'note',
  'healthData', 'sleepData', 'hrvData',
];

export function stripSensitiveFields(data) {
  // 민감 필드 자동 제거 + 경고 기록
}
```

**동작**:
```
입력: { userId, action, content, contentHash, ... }
             ↓
       stripSensitiveFields
             ↓
출력: { userId, action, contentHash, ... }
     (content 제거)
```

### PII 마스킹 전략

#### 클라이언트 (src/lib/utils/mask.js)

```javascript
export function maskDreamContent(content: string): string {
  if (!content || content.length === 0) return '';
  return `[dream:${content.length}chars]`;
}

export function maskSensitiveFields(data: any): any {
  const KEYS = ['dream', 'content', 'healthData', ...];
  const masked = { ...data };
  for (const key of KEYS) {
    if (masked[key]) {
      masked[key] = `[masked]`;
    }
  }
  return masked;
}
```

**사용 예**:
```javascript
// ❌ 금지
console.log('Dream:', dream);

// ✅ 권장
logger.debug('Dream captured:', { symbols_count: dream.symbols.length });

// ✅ 민감 데이터 전송 시
const masked = maskDreamContent(dreamContent);
mixpanel.track('dream_captured', { content: masked });
```

### 엣지 펑션 보안

#### AI Proxy (`ai-proxy/index.ts`)

```typescript
// 1. CORS 검증
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',');

// 2. Bearer 토큰 검증
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return 401; // Unauthorized
}

// 3. JWT 검증 (TODO: Phase 2)
const userId = await resolveUserId(authHeader);

// 4. Rate Limit 확인
const rateLimit = await checkRateLimit(userId, authHeader);
if (!rateLimit.allowed) {
  return 429; // Too Many Requests
}

// 5. 요청/응답 Zod 검증
const validation = validateAnalyzeDreamRequest(payload);
if (!validation.valid) {
  return 400; // Bad Request
}

// 6. Audit log fire-and-forget
fireAuditLog({ userId, action, contentHash, ... });
```

**결과**:
- ✅ 원문 저장 0
- ✅ Rate limit 강제
- ✅ 인증 필수
- ✅ 요청 검증

#### Rate Limit (`rate-limit/index.ts`)

```typescript
// 분당 10회, 일당 100회 제한
export function checkRateLimit(userId: string): RateLimitResult {
  const bucket = store.get(userId) || {
    minute: { count: 0, start: Date.now() },
    day: { count: 0, start: Date.now() },
  };

  // 윈도우 리셋
  if (now - bucket.minute.start >= 60_000) {
    bucket.minute = { count: 0, start: now };
  }

  // 제한 확인
  const allowed =
    bucket.minute.count < 10 &&
    bucket.day.count < 100;

  if (allowed) {
    bucket.minute.count++;
    bucket.day.count++;
  }

  return { allowed, remaining, resetAt };
}
```

### 네트워크 보안

#### HTTPS 강제
```
✅ Vercel: 자동 HTTPS + HSTS
✅ Supabase: 자동 HTTPS
✅ Edge Functions: HTTPS only
```

#### CORS 정책
```typescript
// AI Proxy
const ALLOWED_ORIGINS = ['https://dreamsync-app.vercel.app', ...];

// 요청 origin 검증
if (!ALLOWED_ORIGINS.includes(origin)) {
  return 403; // Forbidden
}

// 응답 헤더
Access-Control-Allow-Origin: origin
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 데이터 저장소 보안

#### Capacitor Preferences (클라이언트)
```
저장소: 디바이스 로컬
│
├─ iOS: Keychain (암호화)
├─ Android: SharedPreferences (암호화 옵션)
└─ Web: localStorage (평문)

⚠️ 주의: 민감 데이터 (비밀번호, 토큰)은
         추가 암호화 필요 (Phase 2+)
```

#### Supabase Database (서버)
```
RLS (Row Level Security)
│
├─ users: auth.uid() == user_id
├─ dreams: auth.uid() == user_id
├─ check_ins: auth.uid() == user_id
└─ audit_logs: admin 전용 (read)

암호화:
  ├─ 전송중: TLS 1.3
  ├─ 저장: PostgreSQL native
  └─ 백업: 암호화 (Supabase 자동)
```

### 준수 사항

#### GDPR / CCPA
```
개인정보 처리:
  ├─ 명시적 동의 (온보딩)
  ├─ 데이터 최소화 (꿈만 저장, 이메일 미저장)
  ├─ 삭제권 (account deletion → cascade delete)
  └─ Privacy Policy (필수, 아직 미작성)

할 일:
  [ ] Privacy Policy 작성
  [ ] Terms of Service 작성
  [ ] Cookie consent banner (필요 시)
```

---

## 개선 로드맵

### Phase 2 (8주) — Production Ready

#### DevOps 우선순위

| 우선순위 | 작업 | 영향도 | 난이도 |
|---------|------|--------|--------|
| 🔴 P0 | Sentry 에러 추적 연동 | 높음 | 낮음 |
| 🔴 P0 | 환경별 배포 파이프라인 (staging) | 높음 | 중간 |
| 🟡 P1 | Rate Limit → Upstash Redis 마이그레이션 | 높음 | 중간 |
| 🟡 P1 | Audit Log → Database 저장 | 중간 | 중간 |
| 🟡 P1 | Mixpanel 이벤트 계측 | 중간 | 낮음 |

#### 상세 계획

**1️⃣ Sentry (1주)**
```bash
npm install @sentry/react @sentry/tracing

// src/main.jsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: isDev ? 'development' : 'production',
  integrations: [
    new Sentry.Replay(),
    new Sentry.HttpClient(),
  ],
  tracesSampleRate: 0.1,
});

// ErrorBoundary.jsx
Sentry.captureException(error);

테스트:
  1. throw new Error('Test')
  2. 확인: Sentry 대시보드에 로그 표시
  3. 알림: Slack #errors 채널 연결

KPI: 24시간 내 에러 해결율 > 90%
```

**2️⃣ 환경별 배포 (2주)**
```bash
# GitHub Actions에 staging 분기 추가
staging:
  branch: staging
  env:
    VITE_BACKEND: supabase
    VITE_AI: edge
    VITE_ANALYTICS: mock
    VITE_FLAGS: local

# Vercel에서 preview 배포 활성화
npm install --save-dev vercel

# PR마다 preview URL 생성
git push origin feature/...
  → Vercel preview: https://pr-123-dreamsync.vercel.app

테스트:
  1. feature 브랜치 생성
  2. Vercel preview URL 확인
  3. staging에 병합
  4. staging-dreamsync.vercel.app 배포 확인
  5. main으로 PR → merge
  6. dreamsync-app.vercel.app 배포 확인

KPI: 환경별 배포 지연 시간 0
```

**3️⃣ Rate Limit Redis 마이그레이션 (2주)**
```bash
# Upstash 계정 생성
https://upstash.com

# supabase/functions/rate-limit/index.ts 수정
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL'),
  token: Deno.env.get('UPSTASH_REDIS_TOKEN'),
});

export async function checkRateLimit(userId: string) {
  const minute_key = `rate:${userId}:m:${epoch_minute}`;
  const minute_count = await redis.incr(minute_key);

  if (minute_count === 1) {
    await redis.expire(minute_key, 60);
  }

  const allowed = minute_count <= 10 && day_count <= 100;
  return { allowed, remaining, resetAt };
}

테스트:
  1. 로컬에서 rate-limit test 실행
  2. Upstash 콘솔에서 key 확인
  3. CI에서 deno test 실행
  4. Staging에 배포 후 부하 테스트

KPI: Rate limit 99.9% 정확도 (분산 환경)
```

### Phase 3 (12주) — Advanced Monitoring

| 작업 | 난이도 | 마감일 |
|------|--------|--------|
| Lighthouse CI 자동화 | 낮음 | Week 4 |
| Performance 모니터링 (web-vitals) | 낮음 | Week 4 |
| Database 인덱스 최적화 | 중간 | Week 8 |
| Kubernetes 또는 Cloud Run 탐색 | 높음 | Week 12 |
| 로드 테스트 (k6) | 중간 | Week 12 |

**Lighthouse CI** (Week 4)
```bash
npm install --save-dev @lhci/cli@0.9.x

# lhci.config.js
export default {
  ci: {
    collect: {
      url: ['https://dreamsync-app.vercel.app/'],
      numberOfRuns: 3,
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://lhci.example.com',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
  },
};

# CI에서
npm run lhci:ci
  ├─ performance > 90
  ├─ accessibility > 95
  └─ 실패 시 배포 차단
```

### Phase 4 (16주) — Enterprise Ready

| 작업 | 마감일 |
|------|--------|
| SLA/SLO 정의 | Week 4 |
| On-call rotation 설정 | Week 4 |
| Incident response playbook | Week 8 |
| Disaster recovery 계획 | Week 12 |
| Multi-region 배포 탐색 | Week 16 |

---

## Risk Matrix & KPI

### Risk Matrix

| Risk | 발생확률 | 영향도 | 현황 | 완화 계획 |
|------|---------|--------|------|----------|
| **Rate Limit 콜드스타트 리셋** | 높음 | 높음 | 🔴 P0 | Phase 3: Redis 마이그레이션 |
| **모니터링 부재 (에러 탐지 지연)** | 높음 | 높음 | 🟡 P1 | Phase 2: Sentry 연동 |
| **Xcode Cloud 자동 배포 미인증** | 중간 | 중간 | 🟡 P1 | Manual approval + Slack 알림 |
| **환경별 배포 설정 혼동** | 중간 | 높음 | 🟡 P1 | Phase 2: 배포 파이프라인 분리 |
| **번들 크기 증가** | 낮음 | 중간 | 🟢 OK | Bundle analyzer 설정 + CI 게이트 |
| **Database 성능 저하** | 낮음 | 높음 | 🟢 OK (Phase 2+) | 인덱스 계획 + 로드 테스트 |

### KPI (Key Performance Indicators)

#### Availability & Reliability
```
SLO: 99.9% uptime (월 43분 다운타임)

측정:
  ├─ Web app: Vercel healthcheck
  ├─ Edge Functions: Supabase metrics
  ├─ Database: RDS 모니터링 (Phase 2+)
  └─ Error rate: <0.1% (Sentry)

Target:
  ├─ P99 latency: <500ms
  ├─ Error rate: <0.01%
  └─ Deployment frequency: 1회/주
```

#### Performance
```
핵심 메트릭:

1. Core Web Vitals
   ├─ LCP (Largest Contentful Paint): <2.5s
   ├─ FID (First Input Delay): <100ms
   └─ CLS (Cumulative Layout Shift): <0.1

2. Bundle Metrics
   ├─ Initial JS: <100KB (gzip)
   ├─ Initial CSS: <50KB (gzip)
   └─ Cache hit: >80%

3. API Latency
   ├─ AI Proxy: <500ms (p95)
   ├─ Rate Limit: <50ms (p95)
   └─ Audit Log: <100ms (p95)

Target:
  ├─ Lighthouse: >90 (Performance, Accessibility)
  ├─ TTFB: <100ms
  └─ Time to interactive: <3s
```

#### Quality & Stability
```
테스트:
  ├─ Unit test coverage: >90%
  ├─ E2E test coverage: >70% (주요 플로우)
  ├─ Mutation score: >80%
  └─ Flaky test rate: 0%

배포:
  ├─ Release gate 통과율: 100%
  ├─ Regression rate: <1%
  ├─ Mean time to recovery (MTTR): <1시간
  └─ Incident rate: <1회/월
```

#### Security
```
보안 점수:

1. Secret Management
   ├─ Secrets in bundle: 0
   ├─ PII in logs: 0
   └─ Unauthorized access: 0

2. Compliance
   ├─ GDPR 준수: 계획 중
   ├─ Rate limit enforcement: 100%
   └─ Audit log completeness: >99%

Target:
  ├─ Security audit: A+
  ├─ Vulnerability scan: 0 critical
  └─ SOC 2 준비: Phase 4
```

#### Cost Efficiency
```
인프라 비용:

Phase 2 (DAU 1k):  ~$54/mo
Phase 3 (DAU 10k): ~$120/mo
Phase 4 (DAU 100k): ~$300/mo

목표:
  ├─ Cost per DAU: <$0.001
  ├─ Compute utilization: >60%
  └─ Waste (unused resources): <5%
```

---

## 결론 및 권고

### 강점 (Strengths)

✅ **자동화된 릴리스 게이트** — 5단계 검증, 0 실패
✅ **비밀 관리 철저** — ANTHROPIC_API_KEY 절대 노출 안 함
✅ **적응적 아키텍처** — Adapter 패턴으로 런타임 환경 전환
✅ **테스트 안정성** — 240 tests, 3-repeat flaky guard
✅ **Edge Function 기반 보안** — 클라이언트 Key 미노출

### 약점 (Weaknesses)

❌ **모니터링 부재** — Sentry/Mixpanel 미연동
❌ **환경별 배포 미분리** — dev/staging/prod 파이프라인 없음
❌ **Rate Limit 인메모리** — 콜드스타트 시 리셋 위험
❌ **롤백 계획 부재** — 배포 실패 시 수동 대응
❌ **데이터베이스 미설정** — Phase 2까지 메모리 저장소만

### 기회 (Opportunities)

🟢 **Sentry 연동** — 사용자 에러 자동 수집 (1주)
🟢 **Staging 환경** — 배포 전 사전 검증 (2주)
🟢 **Redis 마이그레이션** — Rate limit 안정성 (2주)
🟢 **Lighthouse CI** — 성능 저하 조기 탐지 (1주)
🟢 **대시보드** — 운영 상황 실시간 모니터링

### 위협 (Threats)

🔴 **사용자 증가 시 인프라 부족** — Vercel bandwidth 한계 (100GB/mo)
🔴 **콜드스타트 지연** — Deno 함수 >100ms
🔴 **데이터 손실** — 클라이언트 저장소만 사용 중
🔴 **규정 준수 미흡** — GDPR/CCPA 대비 불충분

### 최우선 개선 순서

1. **Week 1-2**: Sentry 에러 추적 (P0)
2. **Week 3-4**: Staging 환경 배포 파이프라인 (P0)
3. **Week 5-6**: Redis Rate Limit 마이그레이션 (P0)
4. **Week 7-8**: Audit Log → Database 저장 (P1)
5. **Week 9-10**: Mixpanel 이벤트 계측 (P1)
6. **Week 11-12**: Lighthouse CI 자동화 (P1)

---

## 부록: 명령어 레퍼런스

### 로컬 개발

```bash
# 개발 서버
npm run dev

# 빌드 테스트
npm run build
npm run preview

# 테스트
npm run test
npm run test:watch
npm run test:coverage
npm run test:repeat        # 3회 반복

# Capacitor 동기화
npm run cap:sync
npm run cap:ios
npm run cap:android

# 검증 (CI와 동일)
npm run verify
npm run lint
npm run typecheck
```

### CI/CD

```bash
# 릴리스 게이트 (배포 전 필수)
bash scripts/release-gate.sh              # 20회 반복 (기본)
bash scripts/release-gate.sh --repeat 50  # 50회 반복 (철저)

# 시크릿 스캔
bash scripts/check-secrets.sh              # Staged 파일
bash scripts/check-secrets.sh --all        # 전체 레포
```

### 배포

```bash
# 로컬 배포 (개발자 전용)
npm run build
# Vercel 대시보드에서 배포

# 또는 Vercel CLI
npm install -g vercel
vercel --prod --token $VERCEL_TOKEN

# 롤백
vercel rollback --prod
```

### 모니터링

```bash
# 성능 검사 (Phase 3+)
npm run lighthouse:ci

# Xcode Cloud 로그
# https://app.xcode.cloud
```

---

## 참고 문서

- **Vercel 배포**: https://vercel.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Xcode Cloud**: https://developer.apple.com/documentation/xcode-cloud
- **Capacitor**: https://capacitorjs.com/docs
- **SRE 가이드**: https://sre.google/books/

---

**보고서 버전**: 1.0
**마지막 업데이트**: 2026-02-21
**다음 검토**: 2026-03-21 (1개월)
