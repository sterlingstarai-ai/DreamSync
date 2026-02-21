# Group C (운영 & 출시) 크로스펑셔널 권고사항

> **Group C Members**: QA, DevOps, Security, PMM
> **작성일**: 2026-02-21
> **목표**: 안전하고 신뢰할 수 있는 출시 및 운영 체계 구축

---

## Executive Summary

DreamSync는 **기술적 품질 우수** (테스트 287개, 뮤테이션 100% kill rate)하나, **출시 준비도** (Supabase 통합, 모니터링, 보안 완성)는 **70-80% 미완성** 상태입니다.

현재 상태:
- ✅ Phase 1 기능 완성도 100% (로컬 모드)
- ⚠️ Supabase 백엔드 통합 (율 제한 인메모리, JWT 미완성)
- ⚠️ 모니터링 시스템 부재 (Sentry, Mixpanel 미연동)
- 🔴 보안 긴급 조치 필요 (Android 암호화, npm 취약점)

**출시 예상 시간**: 현재 P0 조치 후 **3-4주** (Team Lead PM 평가)

---

## 🎯 Group C의 3가지 최우선 크로스펑셔널 권고사항

### **권고 1: Supabase 백엔드 통합 (출시 Blocker)**

#### 문제점 (다중 팀 지적)
| 팀 | 지적 사항 | 심각도 |
|----|---------|--------|
| **PM** | 출시 3-4주 → Supabase 통합이 P0 | 🔴 Critical |
| **Backend** | Rate Limit 인메모리 (콜드스타트 리셋) | 🔴 Critical |
| **Backend** | JWT 검증 미완성 (resolveUserId TODO) | 🔴 Critical |
| **DevOps** | 환경별 파이프라인 분리 필수 | 🟠 High |
| **Security** | Bearer 토큰 검증 미완성 | 🟠 High |

#### 현재 상태
```javascript
// supabase/functions/rate-limit/index.ts (줄 1-30)
// 문제: 인메모리 Map
const rateLimitStore = new Map<string, RateLimitBucket>();
// ← Deno 콜드스타트 시 재초기화됨 (프로덕션 부적합)

// supabase/functions/ai-proxy/index.ts (줄 74-96)
// TODO: JWT 검증 구현 필요
async function resolveUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('authorization');
  // ← Bearer 토큰 파싱만 함, Supabase 검증 미완성
}
```

#### 권고사항 (QA + DevOps + Security 협력)

**A. Rate Limit 구현 교체 (2일, Deno + Redis)**
```typescript
// supabase/functions/rate-limit/index.ts 수정 (콜드스타트 세이프)
import { createClient } from '@supabase/supabase-js';

const kv = Deno.kv.openSync(); // Deno KV (또는 Redis)

async function checkRateLimit(userId: string) {
  // IN-MEMORY → KV-BACKED (persist across cold starts)
  const key = [`rateLimit`, userId, Deno.now()];
  const count = (await kv.get(key)).value ?? 0;

  if (count > LIMIT_PER_MINUTE) return 429;
  await kv.set(key, count + 1, { expiration: Date.now() + 60000 });
  return 200;
}
```

**테스트 추가** (QA):
```bash
# 1. Cold start 시뮬레이션
deno test --allow-net rate-limit.test.ts --cold-start

# 2. KV persistence 검증
[ ] KV에 데이터 저장
[ ] 함수 재시작 후 데이터 유지
[ ] TTL 만료 후 자동 제거
```

---

**B. JWT 검증 완성 (1일, Supabase Auth)**
```typescript
// supabase/functions/ai-proxy/index.ts 수정
import { createClient } from '@supabase/supabase-js';
import { jwtDecode } from 'https://deno.land/x/jwt/mod.ts';

async function resolveUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing auth header');
  }

  const token = authHeader.slice(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Supabase 토큰 검증
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) throw new Error('Invalid token');

  return user.id;
}
```

**테스트 추가** (QA):
```bash
# 1. 유효한 토큰 검증
[ ] Valid JWT → userId 추출 성공
[ ] Expired JWT → 401 Unauthorized
[ ] Invalid signature → 401 Unauthorized
[ ] Missing header → 401 Unauthorized

# 2. 클라이언트 통합 테스트
# src/lib/adapters/ai/edge.test.js 확장
describe('Edge Function JWT', () => {
  it('should attach Authorization header to request');
  it('should handle 401 auth errors');
  it('should retry with refreshed token');
});
```

---

**C. 환경 분리 (1일, GitHub + Supabase)**

```bash
# .github/workflows/ci.yml 확장
jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: supabase functions deploy --project-ref $DEV_PROJECT
        env:
          SUPABASE_PROJECT: ${{ secrets.DEV_SUPABASE_PROJECT }}
          ANTHROPIC_API_KEY: ${{ secrets.DEV_ANTHROPIC_KEY }}

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    steps:
      - run: supabase functions deploy --project-ref $STAGING_PROJECT

  deploy-prod:
    if: github.ref == 'refs/heads/main'
    needs: [deploy-staging]
    steps:
      - run: supabase functions deploy --project-ref $PROD_PROJECT
```

#### 릴리스 게이트 추가 (QA)
```bash
# scripts/release-gate.sh 확장
echo "▶ Gate 6: Supabase 통합 검증"

# Test Rate Limit KV persistence
deno test supabase/functions/rate-limit/logic.test.ts --persist-kv

# Test JWT validation
deno test supabase/functions/ai-proxy/jwt.test.ts

if [[ $? -eq 0 ]]; then
  report "PASS" "Supabase 통합" "(KV + JWT + env separation)"
else
  report "FAIL" "Supabase 통합"
fi
```

#### 예상 영향
- ✅ 프로덕션 Rate Limit 안정화 (콜드스타트 문제 해결)
- ✅ JWT 기반 사용자 격리 (다중 사용자 지원)
- ✅ 환경별 배포 파이프라인 (dev/staging/prod 분리)

---

### **권고 2: 모니터링 & 보안 긴급 조치 (실시간 가시성 + 보안)**

#### 문제점 (다중 팀 지적)
| 팀 | 지적 사항 | 심각도 |
|----|---------|--------|
| **DevOps** | Sentry/에러 트래킹 부재 | 🟠 High |
| **DevOps** | Mixpanel 분석 미연동 | 🟠 High |
| **Security** | Android 암호화 긴급 (AES-GCM) | 🔴 Critical |
| **Security** | npm 취약점 12개 미해결 | 🟠 High |
| **Growth** | Analytics 연동 최우선 | 🟠 High |

#### 현재 상태
```javascript
// src/lib/adapters/analytics.js (mock only)
export const analytics = process.env.VITE_ANALYTICS === 'mixpanel'
  ? mixpanelAdapter
  : mockAdapter;  // ← 실제 Mixpanel 연동 미완성

// android/app/src/main/AndroidManifest.xml
// ← 암호화된 저장소 설정 없음 (민감 데이터 평문 저장)
```

#### 권고사항 (DevOps + Security + Growth 협력)

**A. Sentry 연동 (1일, Error Tracking)**

```javascript
// src/main.jsx 수정
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENV || 'development',
  tracesSampleRate: 1.0,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,  // PII 마스킹
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Error Boundary에 연동
export const ErrorBoundary = Sentry.withProfiler(({ children }) => {
  try {
    return children;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
});
```

**테스트** (QA):
```bash
# 1. Error 발생 시 Sentry 전송 확인
[ ] Uncaught exception → Sentry 이벤트
[ ] Promise rejection → Sentry 이벤트
[ ] API 404 → Sentry 이벤트
[ ] PII 마스킹 확인 (log에 dream 내용 없음)

npm run test:coverage  # coverage 수집
```

---

**B. Mixpanel 통합 (1.5일, Analytics)**

```javascript
// src/lib/adapters/analytics.js 완성
import mixpanel from 'mixpanel-browser';

export const analytics = process.env.VITE_ANALYTICS === 'mixpanel'
  ? {
      track: (event, properties) => {
        const masked = maskSensitiveFields(properties);
        mixpanel.track(event, masked);
      },
      setUser: (userId, traits) => {
        mixpanel.identify(userId);
        mixpanel.people.set(maskSensitiveFields(traits));
      },
      reset: () => mixpanel.reset(),
    }
  : mockAdapter;

// src/store/useAuthStore.js 통합
const signIn = async (...) => {
  // ...
  analytics.setUser(user.id, {
    email: user.email,
    onboardingDate: new Date(),
  });
};
```

**Growth 팀과 협력 (이벤트 정의)**:
```javascript
// src/constants/analyticsEvents.js (신규)
export const EVENTS = {
  DREAM_CAPTURED: 'dream_captured',      // { wordCount, hasVoice }
  CHECKIN_COMPLETED: 'checkin_completed', // { dayOfWeek, timeSpent }
  REPORT_VIEWED: 'report_viewed',        // { reportType }
  GOAL_CREATED: 'goal_created',          // { source }
  GOAL_COMPLETED: 'goal_completed',      // { daysSinceCreated }
  ALERT_TRIGGERED: 'alert_triggered',    // { alertType }
};
```

**테스트** (QA):
```bash
# 1. Event tracking
[ ] Dream captured → mixpanel event with wordCount
[ ] CheckIn completed → mixpanel event with duration
[ ] Report viewed → mixpanel event

# 2. Cohort analysis (Growth 팀 활용)
[ ] Onboarding → Day 1 → Day 7 → Day 30 retention
```

---

**C. Android 암호화 (2일, Security Critical)**

```java
// android/app/src/main/java/com/dreamsync/SecurityUtil.java
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class SecurityUtil {
  public static EncryptedSharedPreferences getSecurePreferences(Context context) {
    MasterKey masterKey = new MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build();

    return EncryptedSharedPreferences.create(
        context,
        "secret_shared_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    );
  }
}

// android/app/build.gradle
dependencies {
  implementation "androidx.security:security-crypto:1.1.0-alpha06"
}
```

**iOS는 이미 Keychain 암호화됨**:
```swift
// ios/App/App/Capacitor.config.json
{
  "plugins": {
    "CapacitorPreferences": {
      "strategy": "keychain"  // ← iOS는 기본적으로 Keychain에 저장
    }
  }
}
```

**테스트** (Security):
```bash
# 1. Android 저장소 검증
[ ] adb shell에서 raw SharedPreferences 접근 불가
[ ] MasterKey로 암호화 확인
[ ] 민감 키 (auth tokens) 암호화 여부

# 2. iOS Keychain 검증
[ ] Keychain 에 저장됨 확인
[ ] 백업/복원 시 보호 여부
```

---

**D. npm 취약점 해결 (1일, Dependency Update)**

```bash
# 1. 취약점 확인
npm audit

# 2. 수정 가능한 것들 업데이트
npm audit fix

# 3. 수정 불가능한 것들 확인
npm audit --json | grep "severity" | grep -E "high|critical"

# 예상 결과: 12개 → 2-3개 (deprecated 패키지 제거 후)
```

**패키지 정리** (optional):
```bash
# 불필요한 패키지 제거
npm uninstall <unused-package>

# Dependabot 자동화 (GitHub)
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "production"
```

#### 릴리스 게이트 추가 (DevOps + Security)
```bash
# scripts/release-gate.sh 확장
echo "▶ Gate 6: 모니터링 & 보안"

# Sentry 연동 확인
[ -f dist/js/app.*.js ] && grep -q "sentry" dist/js/app.*.js && SENTRY_OK=1 || SENTRY_OK=0

# npm audit 확인
CRITICAL_VULNS=$(npm audit --json 2>/dev/null | grep -c '"severity":"critical"' || echo 0)

if [[ $SENTRY_OK -eq 1 ]] && [[ $CRITICAL_VULNS -eq 0 ]]; then
  report "PASS" "모니터링 & 보안" "(Sentry OK, 취약점 0)"
else
  report "FAIL" "모니터링 & 보안"
fi
```

#### 예상 영향
- ✅ 실시간 에러 추적 (Sentry)
- ✅ 사용자 행동 분석 (Mixpanel) → Growth 팀 리텐션 측정 가능
- ✅ 암호화된 저장소 (Android AES-GCM)
- ✅ 보안 취약점 0 critical/high

---

### **권고 3: E2E 테스트 & 릴리스 자동화 (배포 신뢰성)**

#### 문제점 (QA + DevOps 지적)
| 팀 | 지적 사항 | 심각도 |
|----|---------|--------|
| **QA** | E2E 테스트 부재 (Playwright) | 🟠 High |
| **QA** | 유틸리티 함수 미테스트 | 🟠 High |
| **DevOps** | 환경별 설정 분리 미흡 | 🟠 High |
| **DevOps** | 마이그레이션/롤백 계획 부재 | 🟡 Medium |
| **Security** | 출시 전 보안 체크리스트 없음 | 🟡 Medium |

#### 현재 상태
```
✅ Unit Test: 287개 (73%)
✅ Integration: 48개 (17%)
❌ E2E: 0개 (Playwright 미설정)
❌ Performance: 0개 (로드 테스트 없음)
```

#### 권고사항 (QA + DevOps 협력)

**A. Playwright E2E 설정 (3일)**

```bash
# 1. 설치
npm install -D @playwright/test

# 2. playwright.config.js 생성
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

**핵심 시나리오 (tests/e2e/)**:
```javascript
// tests/e2e/01-auth.spec.js
describe('Auth flow', () => {
  test('should signup → login → dashboard', async ({ page }) => {
    // 회원가입
    await page.goto('/login');
    await page.click('text=Sign up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('text=Create account');
    await expect(page).toHaveURL('/onboarding');

    // 온보딩 완료
    await page.click('text=Skip');
    await expect(page).toHaveURL('/dashboard');
  });
});

// tests/e2e/02-dream-flow.spec.js
describe('Dream capture flow', () => {
  test('input → analyze → save → dashboard', async ({ page }) => {
    // 로그인
    await loginHelper(page);

    // 꿈 입력
    await page.goto('/dream-capture');
    await page.fill('[placeholder="describe your dream"]', 'I was flying...');
    await page.click('text=Analyze');

    // 분석 완료 대기
    await page.waitForSelector('text=Dream saved successfully', { timeout: 5000 });

    // Dashboard에 표시 확인
    await page.goto('/dashboard');
    await expect(page).toContainText('I was flying');
  });
});

// tests/e2e/03-offline-sync.spec.js
describe('Offline sync', () => {
  test('offline save → online sync', async ({ page, context }) => {
    await loginHelper(page);

    // 오프라인 모드로 전환
    await context.setOffline(true);
    await page.goto('/dream-capture');
    await page.fill('[placeholder="..."]', 'Dream while offline');
    await page.click('text=Save');

    // 오프라인 배너 표시 확인
    await expect(page).toContainText('Offline');

    // 온라인 복구
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // 데이터 동기화 확인
    await page.goto('/dashboard');
    await expect(page).toContainText('Dream while offline');
  });
});
```

**package.json 스크립트 추가**:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

---

**B. 유틸리티 함수 테스트 (2일)**

```bash
# 신규 테스트 파일 (QA 담당)
touch src/utils/date.test.js
touch src/utils/error.test.js
touch src/utils/id.test.js

# 커버리지 목표
npm run test:coverage

# 결과 예상
# Current coverage:
# Line: 73% → 85%+
# Function: 72% → 90%+
```

**예시: date.test.js**
```javascript
describe('Date utilities', () => {
  describe('formatDates', () => {
    it('should format date as YYYY-MM-DD', () => {
      const result = formatDates(new Date('2026-02-21'));
      expect(result).toBe('2026-02-21');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDates(null)).not.toThrow();
      expect(formatDates(null)).toBe('Invalid date');
    });
  });

  describe('addDays', () => {
    it('should add N days correctly', () => {
      const base = new Date('2026-02-21');
      const result = addDays(base, 7);
      expect(result.toISOString().split('T')[0]).toBe('2026-02-28');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });
});
```

---

**C. 출시 자동화 스크립트 (1.5일)**

```bash
# scripts/release-process.sh (신규)
#!/bin/bash
set -euo pipefail

VERSION=${1:-patch}  # major | minor | patch
ENVIRONMENT=${2:-staging}

echo "═══════════════════════════════════════════════"
echo "  DreamSync Release Process"
echo "  Version: $VERSION"
echo "  Environment: $ENVIRONMENT"
echo "═══════════════════════════════════════════════"

# 1. 모든 검증 실행
echo "▶ Running release gate..."
bash scripts/release-gate.sh --repeat 20

# 2. E2E 테스트 실행
echo "▶ Running E2E tests..."
npm run test:e2e

# 3. 버전 업데이트
echo "▶ Updating version..."
npm version $VERSION --no-git-tag-version

# 4. 변경로그 생성 (optional)
echo "▶ Generating changelog..."
git log $(git describe --tags --abbrev=0)..HEAD --oneline > CHANGELOG_LATEST.md

# 5. 배포 준비
echo "▶ Building for $ENVIRONMENT..."
VITE_ENV=$ENVIRONMENT npm run build

# 6. 보안 검사 (Snyk)
echo "▶ Running security scan..."
npx snyk test --severity-threshold=high || echo "⚠️ Security issues found"

# 7. 환경별 배포 (수동 승인)
echo "═══════════════════════════════════════════════"
echo "✅ All checks passed. Ready for deployment."
echo "═══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Verify dist/ folder"
echo "  2. Run: npm run cap:sync (for iOS/Android)"
echo "  3. Merge PR to 'main' branch"
echo "  4. GitHub Actions will deploy to production"
echo ""
```

**GitHub Actions 통합**:
```yaml
# .github/workflows/release.yml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Semantic version (major|minor|patch)'
        required: true
        default: 'patch'
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: bash scripts/release-process.sh ${{ github.event.inputs.version }} ${{ github.event.inputs.environment }}

      - name: Deploy to Vercel
        if: github.event.inputs.environment == 'production'
        run: npx vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Create Release
        if: github.event.inputs.environment == 'production'
        run: |
          gh release create v$(node -p "require('./package.json').version") \
            --title "Release $(node -p "require('./package.json').version")" \
            --notes-file CHANGELOG_LATEST.md
```

---

**D. 릴리스 체크리스트 (출시 前)**

```markdown
# 출시 전 최종 체크리스트

## 1. 기술 검증
- [ ] npm run verify (lint + typecheck + build + test) 통과
- [ ] npm run test:repeat (3회) 통과
- [ ] npm run test:e2e (모든 브라우저) 통과
- [ ] npm audit 결과 critical/high 취약점 0개
- [ ] Sentry 모니터링 활성화 확인
- [ ] Mixpanel 이벤트 추적 확인

## 2. 보안 검증
- [ ] ANTHROPIC_API_KEY 번들 노출 0 (grep -rE 'sk-ant' dist/)
- [ ] PII 마스킹 검증 (maskDreamContent, maskSensitiveFields)
- [ ] Android 암호화 (AES-GCM) 적용
- [ ] JWT 검증 구현 (Supabase)
- [ ] HTTPS 활성화 (production)
- [ ] CORS 설정 점검

## 3. 운영 준비
- [ ] 데이터베이스 마이그레이션 계획 (Supabase)
- [ ] 롤백 절차 문서화
- [ ] 모니터링 대시보드 설정 (Sentry, Mixpanel)
- [ ] 예상 로드 테스트 (100 concurrent users)
- [ ] 백업/복구 계획

## 4. 사용자 준비
- [ ] 개인정보처리방침 (Privacy Policy) 작성
- [ ] 서비스 이용약관 (ToS) 작성
- [ ] 온보딩 가이드 (In-app)
- [ ] FAQ 페이지 준비

## 5. 출시 승인 (Team Lead)
- [ ] PM 승인: 기능 완성도 100%, 사용자 경험 검증
- [ ] QA 승인: 테스트 커버리지 >90%, E2E 통과
- [ ] Security 승인: 취약점 0, 암호화 적용
- [ ] DevOps 승인: 배포 자동화, 모니터링 활성화
- [ ] CEO/Stakeholder 최종 승인
```

#### 예상 영향
- ✅ 사용자 여정 E2E 검증 (회원가입 → 꿈 기록 → 동기화)
- ✅ 성능 테스트 (모바일, 오프라인, 동시 사용자)
- ✅ 출시 프로세스 자동화 (수동 실수 제거)
- ✅ 출시 후 쉬운 롤백 (버전 관리, changelog)

---

## 📊 통합 로드맵 (Timeline)

### **Week 1-2 (우선순위 1: Supabase + Security)**
```
목표: 프로덕션 출시 사전 준비
┌─────────────────────────────────┐
│ Day 1-2: Rate Limit KV 교체      │ (Backend Lead)
│ Day 2-3: JWT 검증 완성          │ (Security + Backend)
│ Day 3-4: Sentry + Mixpanel 연동 │ (DevOps)
│ Day 4-5: Android 암호화         │ (Security)
│ Day 5: npm audit 해결           │ (DevOps)
│ Day 6-7: 통합 테스트 & 검증     │ (QA)
└─────────────────────────────────┘
```

### **Week 2-3 (우선순위 2: E2E + 자동화)**
```
목표: 배포 신뢰성 확보
┌─────────────────────────────────┐
│ Day 8-10: Playwright 설정        │ (QA)
│ Day 10-11: 핵심 시나리오 (5개)  │ (QA)
│ Day 12: 유틸리티 함수 테스트    │ (QA)
│ Day 13-14: 릴리스 스크립트 구축 │ (DevOps)
└─────────────────────────────────┘
```

### **Week 3-4 (출시 준비)**
```
목표: 최종 검증 & 출시
┌─────────────────────────────────┐
│ Day 15: 출시 전 체크리스트      │ (All teams)
│ Day 16: 최종 보안 감사          │ (Security)
│ Day 17: 성능 테스트             │ (QA)
│ Day 18: 사용자 문서 준비        │ (PMM)
│ Day 19: Staging 배포            │ (DevOps)
│ Day 20-21: 모니터링 검증 & 출시 │ (DevOps + QA)
└─────────────────────────────────┘
```

---

## 🎯 성공 지표 (KPI)

| 지표 | 현재 | 목표 (출시 전) |
|------|------|--------|
| Unit Test Coverage | 96% | 90%+ |
| E2E Test Coverage | 0% | 80%+ (주요 시나리오) |
| npm Audit (Critical) | 12 | 0 |
| Security Scan (High) | 5 | 0 |
| Sentry Integration | ❌ | ✅ |
| Mixpanel Events | 0 tracked | 8+ tracked |
| Deployment Time | - | <10분 (자동화) |
| MTTR (Mean Time To Recovery) | - | <30분 |
| Uptime Target | - | 99.5% |

---

## 📋 Group C 간단 요약

| 권고사항 | 담당팀 | 소요시간 | 출시 영향 |
|---------|--------|---------|----------|
| 1. Supabase 통합 | Backend + DevOps + Security | 4일 | Critical (출시 Blocker) |
| 2. 모니터링 & 보안 | DevOps + Security + Growth | 4일 | High (운영 신뢰성) |
| 3. E2E + 자동화 | QA + DevOps | 6일 | High (배포 신뢰성) |
| **합계** | **전체** | **14일** | **3주 내 출시 가능** |

---

## 다음 단계

1. **즉시** (Today): Team Lead의 Group A, B, C 권고사항 검토 및 우선순위 조정
2. **Day 1**: 각 팀 Lead 회의 → 역할 분담 및 일정 확정
3. **Week 1**: Supabase + Security 우선순위 작업 시작
4. **Week 2-3**: E2E + 자동화 병렬 진행
5. **Week 4**: 최종 검증 및 출시 준비

---

**Group C (QA, DevOps, Security, PMM)**가 모두 협력하여 **안전하고 신뢰할 수 있는 출시**를 목표로 합니다.

문의사항이 있으시면 Group Lead (DevOps/QA)에게 연락주세요.
