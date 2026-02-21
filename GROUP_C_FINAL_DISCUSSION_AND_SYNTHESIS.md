# Group C 최종 토론: 출시 전 필수 결정 사항

> **Group C Members**: QA (70/100), DevOps (⭐⭐/⭐⭐⭐⭐⭐), Security (84%), PMM
> **토론 날짜**: 2026-02-21
> **의제**: 4가지 핵심 토론 주제 → 3가지 크로스펑셔널 권고사항 도출

---

## 토론 내용 종합

### 📌 토론 주제 1: 출시 전 필수 게이트

#### Security 주장: **Android 암호화 + npm 취약점은 출시 전 반드시 해결**

**Security 보고서 근거**:
```
Android: SharedPreferences 평문 저장 (🔴 Critical)
  → 꿈 내용, 사용자 정보 노출 위험
  → Encrypted SharedPreferences 필수 (1일)

npm 취약점: 12개 (critical/high 포함)
  → 배포 전 0으로 감소 필수
  → npm audit fix + Dependabot (1일)

CORS 와일드카드: 15분 수정 가능
  → ALLOWED_ORIGINS 검증 (긴급 패치)
```

**결정**: ✅ **Android 암호화 + npm 취약점 0은 출시 Blocker**
- DevOps는 배포 체크리스트에 추가
- Security는 pre-release 스캔 자동화

---

#### DevOps 주장: **Sentry는 출시 후 구성 가능, 다만 기본 로깅은 필수**

**DevOps 보고서 근거**:
```
현황: 모니터링 부재 (⭐⭐/⭐⭐⭐⭐⭐)
  → 출시 후 에러 추적 불가능

제안: Sentry 1주 소요 (너무 길다)
  → 대신 "최소 로깅" 출시 전 활성화
  → 주간 단위 모니터링 개선 (MVP 접근)
```

**핵심 토론**:
- QA: "E2E 테스트 3일 + 유틸리티 테스트 2일 = 5일이 이미 소비된다"
- DevOps: "Sentry 1주는 과도하다. 기본 logger만 출시 전 활성화하고, Sentry는 Week 1에 추가"
- Security: "동의. 출시 전 PII 로깅 검사 (mask.js) 만 필수. 전체 모니터링은 Phase 1.1"

**결정**: ⚠️ **Sentry는 출시 후 1주 내 추가, 대신 기본 에러 로깅은 출시 전 활성화**

---

### 📌 토론 주제 2: E2E 테스트 vs 출시 일정

#### QA 주장: **Playwright 3일 + 유틸리티 테스트 2일 = 70/100 → 85/100 가능, 출시 3주와 양립 가능**

**QA 보고서 근거**:
```
현황: 287개 테스트, E2E 0개 (피라미드 부족)
  → 단위 테스트만으로는 사용자 여정 미검증

Playwright 설정: 3일
  - playwright.config.js (30분)
  - 5개 핵심 시나리오 (2.5일)
    ├─ auth flow
    ├─ dream capture → dashboard
    ├─ offline sync
    ├─ goal creation
    └─ alert trigger

유틸리티 함수: 2일
  - date.test.js, error.test.js, id.test.js
  → 커버리지 73% → 85%+ 상승

합계: 5일 (출시 3-4주 내 가능)
```

**핵심 토론**:
- DevOps: "CI 시간은? Playwright 실행 시간?"
- QA: "Playwright ~3분 (headless), CI에는 artifact 캐싱 추가 (1분) → 총 45초 → 2분."
- Security: "E2E는 보안 테스트 범위? (예: HTTPS redirect 검증)"
- QA: "기본 시나리오만 포함. 보안 E2E는 Phase 1.1에서 (API CORS, rate limit 테스트)"

**결정**: ✅ **Playwright 3일 + 유틸리티 테스트 2일 출시 전 착수 권장**
- E2E는 회원가입 → 꿈 기록 → 동기화만 커버
- 보안 E2E (JWT, CORS, rate limit)는 출시 후 추가

---

### 📌 토론 주제 3: 모니터링 체계 (최소한의 모니터링은?)

#### DevOps + Security 합의: **Sentry는 출시 후, 대신 출시 전 필수 로깅 3가지**

**합의 내용**:

```
출시 전 필수:
┌─────────────────────────────────┐
│ 1. 에러 로깅 활성화             │
│    └─ logger.error() DEV 모드 제거
│    └─ Capacitor console 기록 활성화
│                                 │
│ 2. PII 마스킹 검증             │
│    └─ maskDreamContent 적용 확인
│    └─ maskSensitiveFields 적용 확인
│    └─ Audit Log strip 검증
│                                 │
│ 3. Health Check Endpoint       │
│    └─ /health → {"status": "ok"}
│    └─ 배포 후 모니터링 기본
└─────────────────────────────────┘

출시 후 Phase 1.1 (1주):
┌─────────────────────────────────┐
│ Sentry 통합                     │
│  └─ PII 마스킹 설정 (replay)   │
│  └─ Error tracking              │
│  └─ Performance monitoring      │
│                                 │
│ Mixpanel 분석 (Growth 팀)      │
│  └─ 8개 핵심 이벤트            │
└─────────────────────────────────┘
```

**결정**: 🟢 **출시 전: 기본 로깅 + PII 검증**
**결정**: 🟠 **출시 후 1주: Sentry + Mixpanel 추가**

---

### 📌 토론 주제 4: GTM 준비 (기술 팀의 책임)

#### PMM 요구사항 (ProductHunt + AppStore)

**PMM 보고서 근거**:
```
GTM 3단계:
1. ProductHunt 런칭 (Day 0)
   - 메타: 제목, 설명, 스크린샷 5개, 동영상
   - 기술팀 책임: 최종 앱 스크린샷 + 녹화

2. iOS/Android AppStore 등록 (Day 1-3)
   - 메타: 아이콘, 스크린샷, 설명, 평점
   - 기술팀 책임: 앱 심사 대비, 정책 준수

3. 론칭 후 모니터링 (Day 1+)
   - Growth 팀: 바이럴 계수 (K 값)
   - 기술팀 책임: Mixpanel 추적, 버그 핫픽스
```

**QA + DevOps + Security 체크리스트**:

```
┌─── 출시 전 기술팀 필수 준비 ───┐
│                               │
│ ✅ 개인정보처리방침 (Privacy Policy)
│    └─ PII 수집, 마스킹, 보관 정책
│                               │
│ ✅ 서비스 이용약관 (ToS)
│    └─ 약관 동의 UI (Onboarding)
│                               │
│ ✅ Crash Log 분석
│    └─ 번들 크기 <100MB (iOS/Android)
│    └─ 퍼미션 최소화 (Privacy)
│                               │
│ ✅ AppStore 심사 대비
│    └─ HTTPS 적용
│    └─ 서드파티 라이브러리 라이선스
│    └─ 배경음악 (저작권 확인)
│                               │
│ ✅ 스크린샷 + 녹화
│    └─ 주요 기능 5가지 (회원가입, 꿈 기록, 리포트, 설정, 심볼)
│    └─ 각 기능당 스크린샷 3-5장
│    └─ 30초 기능 시연 영상
│                               │
│ ✅ 출시 후 대응 계획
│    └─ 버그 핫픽스 프로세스
│    └─ 긴급 보안 패치 절차
│    └─ AppStore 심사 재제출 준비
│                               │
└───────────────────────────────┘
```

**결정**: 🟢 **다음 주 PMM과 협력 킥오프**
- 기술팀: 스크린샷 + 영상 준비 (2일)
- PMM: ProductHunt 메타 작성 (병렬)
- Security: Privacy Policy 기술 검수

---

## 🎯 Group C의 3가지 최우선 크로스펑셔널 권고사항

### **권고 1: 출시 전 필수 보안 게이트 (2-3일) — MUST HAVE**

#### 문제 정의
출시 후 보안 이슈 발생 시 신뢰도 급락 (특히 개인정보 취급 앱).

#### 3가지 Critical Path

**A. Android 암호화 (1일) — 🔴 CRITICAL**
```java
// android/app/build.gradle
dependencies {
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
}

// android/app/src/main/java/com/dreamsync/SecurityUtil.java
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
```

**테스트 (DevOps + Security)**:
```bash
# adb에서 SharedPreferences 검증
adb shell run-as com.dreamsync.app cat /data/data/com.dreamsync.app/shared_prefs/*.xml
# 결과: 암호화된 바이너리 (읽을 수 없음) ✅

# npm test 추가
describe('Android encryption', () => {
  it('should use AES-GCM encryption');
  it('should not leak plaintext in APK');
});
```

---

**B. npm 취약점 → 0 (1일) — 🟠 HIGH**
```bash
# 1. 현재 상태 확인
npm audit
# 예상: 12개 (critical/high)

# 2. 자동 수정
npm audit fix

# 3. 수정 불가능한 것들 평가
npm audit --json | jq '.vulnerabilities[] | select(.severity=="critical")'

# 4. Dependabot 자동화
# .github/dependabot.yml (이미 설정됨)

# 5. CI에 npm audit 게이트 추가
npm audit --audit-level=high
# Exit code: 1 if found, 0 if clear
```

**릴리스 게이트 추가**:
```bash
# scripts/release-gate.sh Gate 7 추가
echo "▶ Gate 7: npm Audit"
if npm audit --audit-level=high > /dev/null 2>&1; then
  report "FAIL" "npm audit" "(critical/high vulnerabilities found)"
else
  report "PASS" "npm audit" "(0 critical/high)"
fi
```

---

**C. CORS 와일드카드 수정 (15분) — 🟡 MEDIUM**
```typescript
// supabase/functions/ai-proxy/index.ts
const ALLOWED_ORIGINS = [
  'https://dreamsync-app.vercel.app',     // production
  'https://staging-dreamsync.vercel.app', // staging
  'http://localhost:5173',                 // dev
];

function setCorsHeaders(req: Request, origin: string) {
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,  // ← 와일드카드 제거
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
```

#### 실행 계획
```
Timeline: 2일 (병렬)
┌──────────────────────────────────┐
│ Day 1: Android 암호화 + npm audit │
│  └─ Backend: Android 암호화 구현
│  └─ DevOps: npm audit fix + CI 추가
│  └─ Security: 검증 테스트
│                                  │
│ Day 2: CORS 수정 + 통합 테스트  │
│  └─ Backend: CORS 수정
│  └─ QA: E2E 테스트 재실행
│  └─ Security: 최종 감사
│                                  │
│ Day 3: 출시 전 보안 체크리스트  │
│  └─ Security: 최종 OK/FAIL
│  └─ DevOps: 배포 경로 확인
└──────────────────────────────────┘
```

#### 영향
- ✅ Android 사용자 데이터 암호화 → 신뢰도 상승
- ✅ npm 취약점 0 → AppStore 심사 통과 확률 ↑
- ✅ CORS 정책 강화 → 공격 표면 감소

#### 성공 지표
```
[ ] Android: adb에서 SharedPreferences 평문 읽기 불가
[ ] npm: npm audit --audit-level=high 통과
[ ] CORS: 와일드카드 제거, 화이트리스트 적용
[ ] CI: Gate 7 (npm audit) + Gate 8 (Android crypto 검증) 추가
```

---

### **권고 2: 최소 모니터링 + E2E 테스트 (5일) — CRITICAL PATH**

#### 문제 정의
- 출시 후 "앱이 먹통인데 무슨 일인지 모른다" → 신뢰도 폭락
- 사용자 여정 미검증 → 배포 후 기본 플로우 깨짐 가능

#### A. 기본 에러 로깅 활성화 (1일) — 출시 전 필수

```javascript
// src/lib/utils/logger.js (이미 존재)
// 현재: DEV 모드만 로깅

// 수정: 프로덕션도 기본 error/warn 로깅
export const logger = {
  error: (msg, context) => {
    // 1. 콘솔 + Capacitor Log
    console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, context);

    // 2. Toast (사용자 알림)
    toast.error('앱 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');

    // 3. 로컬 로그 파일 (선택)
    // Capacitor.Filesystem.appendFile({
    //   path: 'app.log',
    //   data: `${msg}\n${JSON.stringify(context)}\n`,
    // });

    // 4. PII 마스킹 후 분석 서버 (Phase 1.1: Sentry)
    // Sentry.captureException(new Error(msg), { extra: maskSensitiveFields(context) });
  },

  warn: (msg, context) => { /* ... */ },
  info: (msg, context) => { /* ... */ }, // DEV 모드만
};
```

**테스트**:
```bash
# 1. 에러 발생 시 toast 표시 확인
[ ] API 404 → toast "앱 오류가 발생했습니다"
[ ] 로컬 스토리지 실패 → toast + console.error

# 2. PII 마스킹 검증
[ ] dream 내용 로그 출력 안 함
[ ] healthData 출력 안 함
[ ] 민감 필드 14개 모두 체크

npm test -- --grep "logger"  # 기존 테스트 통과
```

---

#### B. Playwright E2E 테스트 (3일) — 출시 전 필수

```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**5개 핵심 시나리오** (tests/e2e/):

```javascript
// 1. auth.spec.js — 회원가입 → 로그인 → 대시보드
describe('Auth flow', () => {
  test('signup → login → dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('text=Create account');
    await expect(page).toHaveURL('/onboarding');

    // 온보딩 스킵
    await page.click('text=Skip');
    await expect(page).toHaveURL('/dashboard');
  });
});

// 2. dream-flow.spec.js — 꿈 입력 → 분석 → 저장 → Dashboard 표시
describe('Dream capture', () => {
  test('input → analyze → save → appear in dashboard', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('text=Sign in');

    // 꿈 입력
    await page.goto('/dream-capture');
    await page.fill('textarea', 'I was flying in the sky');
    await page.click('button:has-text("Analyze")');

    // 분석 대기
    await page.waitForSelector('text=Dream saved', { timeout: 5000 });

    // Dashboard 확인
    await page.goto('/dashboard');
    await expect(page).toContainText('I was flying');
  });
});

// 3. offline-sync.spec.js — 오프라인 저장 → 온라인 동기화
describe('Offline sync', () => {
  test('offline save → online sync', async ({ page, context }) => {
    // 로그인 후 오프라인
    await loginHelper(page);
    await context.setOffline(true);

    // 오프라인 저장
    await page.goto('/dream-capture');
    await page.fill('textarea', 'Offline dream');
    await page.click('button:has-text("Save")');

    // 오프라인 배너 표시
    await expect(page).toContainText('Offline');

    // 온라인 복구
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Dashboard에 데이터 표시
    await page.goto('/dashboard');
    await expect(page).toContainText('Offline dream');
  });
});

// 4. goal-creation.spec.js — 목표 생성 → 추적
describe('Goal tracking', () => {
  test('create goal → track progress', async ({ page }) => {
    await loginHelper(page);
    await page.goto('/dashboard');

    // 목표 생성
    await page.click('button:has-text("Create Goal")');
    await page.fill('[name="title"]', 'Sleep 8 hours');
    await page.click('button:has-text("Save")');

    // 목표 표시 확인
    await expect(page).toContainText('Sleep 8 hours');
  });
});

// 5. alert-trigger.spec.js — 경보 발생
describe('Pattern alerts', () => {
  test('stress spike triggers alert', async ({ page }) => {
    await loginHelper(page);

    // 높은 스트레스 입력
    await page.goto('/check-in');
    await page.click('button:has-text("Stress: 9")');
    await page.click('button:has-text("Complete")');

    // 경보 표시 확인
    await expect(page).toContainText('High stress detected');
  });
});
```

**package.json 추가**:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm test && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
```

---

#### C. 유틸리티 함수 테스트 (2일)

```javascript
// src/utils/date.test.js
describe('Date utilities', () => {
  describe('formatDates', () => {
    it('should format as YYYY-MM-DD', () => {
      const result = formatDates(new Date('2026-02-21'));
      expect(result).toBe('2026-02-21');
    });

    it('should handle invalid dates', () => {
      expect(formatDates(null)).toBe('Invalid date');
    });
  });

  describe('addDays', () => {
    it('should add days', () => {
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

    it('should handle edge cases (midnight)', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      expect(isToday(midnight)).toBe(true);
    });
  });
});

// src/utils/id.test.js
describe('ID utilities', () => {
  it('should generate unique IDs', () => {
    const ids = Array.from({ length: 100 }, () => generateId());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100); // 모두 unique
  });

  it('should generate IDs with correct format', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  });
});

// src/utils/error.test.js
describe('Error utilities', () => {
  it('should create AppError with message', () => {
    const error = new AppError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
  });

  it('should handle error in try-catch', () => {
    expect(() => {
      throw new AppError('Async error', 'ASYNC_ERROR');
    }).toThrow(AppError);
  });
});
```

**커버리지 개선**:
```bash
npm run test:coverage

# 현재: Line 73%
# 목표: Line 85%+

# 결과 확인
cat coverage/index.html  # HTML 리포트 보기
```

#### 실행 계획
```
Timeline: 5일
┌────────────────────────────────────┐
│ Day 1: 기본 로깅 활성화            │
│  └─ QA: logger.error 테스트 추가
│  └─ QA: PII 마스킹 검증
│                                    │
│ Day 2-3: Playwright 설정 + 시나리오
│  └─ QA: playwright.config.js
│  └─ QA: 5개 시나리오 작성
│  └─ DevOps: CI에 E2E 추가
│                                    │
│ Day 4-5: 유틸리티 테스트          │
│  └─ QA: date.test.js, error.test.js, id.test.js
│  └─ QA: 커버리지 85%+ 달성
│                                    │
│ Day 6: 통합 실행 (test:all)       │
│  └─ Unit (287) + E2E (5) + coverage
│                                    │
└────────────────────────────────────┘
```

#### 영향
- ✅ 사용자 여정 E2E 검증 (배포 후 기본 플로우 안심)
- ✅ 기본 에러 로깅 (출시 후 문제 파악 가능)
- ✅ 커버리지 85%+ (회귀 버그 감소)

#### 성공 지표
```
[ ] Playwright: 5개 시나리오 모두 Green
[ ] Logger: error/warn 로그 출력 검증
[ ] PII: 민감 필드 14개 모두 마스킹
[ ] Coverage: Line 85%+
[ ] CI: test:all 통과 (<3분)
```

---

### **권고 3: PMM 협력 + 출시 체크리스트 자동화 (3일) — MUST HAVE**

#### 문제 정의
- 기술팀과 PMM이 출시 준비 단계에서 coordination 부족
- 앱스토어 심사 실패 → 출시 지연

#### A. PMM과 기술팀 협력 (2일)

**역할 분담**:

```
┌─── Week 0 (지금) ───┐
│                    │
│ 기술팀:            │
│ • 스크린샷 준비   │
│ • 앱 녹화         │
│ • 정책 문서 검수 │
│                    │
│ PMM:              │
│ • ProductHunt 메타
│ • 앱스토어 설명  │
│ • 언론 보도 자료 │
│                    │
└────────────────────┘

┌─── Week 1 (출시) ───┐
│                    │
│ 기술팀:            │
│ • 앱 최종 빌드    │
│ • 앱스토어 제출   │
│ • Sentry 활성화   │
│                    │
│ PMM:              │
│ • ProductHunt 론칭
│ • 소셜 미디어 공지
│ • 매체 소식 배포 │
│                    │
└────────────────────┘

┌─── Week 1+ (모니터링) ─┐
│                       │
│ 기술팀:               │
│ • 버그 핫픽스         │
│ • Mixpanel 추적       │
│ • 성능 모니터링       │
│                       │
│ Growth/PMM:          │
│ • K값 (바이럴 계수)   │
│ • 리텐션 추적         │
│ • 유저 피드백 수집   │
│                       │
└───────────────────────┘
```

---

#### B. 기술팀 준비 체크리스트 (자동화)

```bash
# scripts/gtm-checklist.sh (신규)
#!/bin/bash
set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  GTM 준비 체크리스트"
echo "═══════════════════════════════════════════════"
echo ""

# 1. 앱 빌드 검증
echo "▶ 1. 앱 빌드 검증"
npm run build
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "  ✅ Web build OK"
else
  echo "  ❌ Web build FAILED"
  exit 1
fi

# 2. 번들 크기 확인
BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
echo "  Bundle size: $BUNDLE_SIZE (목표: <10MB web, <100MB iOS/Android)"

# 3. 정책 문서 존재 확인
echo ""
echo "▶ 2. 정책 문서 확인"
[ -f "docs/PRIVACY_POLICY.md" ] && echo "  ✅ Privacy Policy" || echo "  ❌ Missing Privacy Policy"
[ -f "docs/TERMS_OF_SERVICE.md" ] && echo "  ✅ Terms of Service" || echo "  ❌ Missing ToS"

# 4. 라이선스 확인
echo ""
echo "▶ 3. 라이선스 확인"
npm ls --depth=0 | grep -E "^├|^└" | grep "UNLICENSED" && echo "  ⚠️ Found UNLICENSED packages"
npm ls --all | grep -c "GPL" && echo "  ⚠️ GPL license (AppStore 부적합)" || echo "  ✅ No GPL licenses"

# 5. 스크린샷 / 영상 확인
echo ""
echo "▶ 4. 마케팅 자료 확인"
[ -d "marketing/screenshots" ] && ls marketing/screenshots/*.png | wc -l | xargs -I {} echo "  ✅ Screenshots: {} files"
[ -f "marketing/app-demo.mp4" ] && echo "  ✅ Demo video exists" || echo "  ❌ Missing demo video"

# 6. 최종 게이트
echo ""
echo "▶ 5. 최종 출시 게이트"
bash scripts/release-gate.sh --repeat 3 > /dev/null 2>&1 && echo "  ✅ All release gates passed" || echo "  ❌ Release gate FAILED"

echo ""
echo "═══════════════════════════════════════════════"
echo "  출시 준비 완료!"
echo "═══════════════════════════════════════════════"
```

**CI에 GTM 체크 추가**:

```yaml
# .github/workflows/gtm-check.yml
name: GTM Checklist

on:
  workflow_dispatch:  # 수동 실행

jobs:
  gtm-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: GTM Checklist
        run: bash scripts/gtm-checklist.sh

      - name: Report
        run: |
          echo "## GTM 준비 완료" >> $GITHUB_STEP_SUMMARY
          echo "- Web build OK" >> $GITHUB_STEP_SUMMARY
          echo "- All policies present" >> $GITHUB_STEP_SUMMARY
          echo "- Release gates passed" >> $GITHUB_STEP_SUMMARY
```

---

#### C. 출시 후 모니터링 계획 (Phase 1.1)

```
출시 후 72시간 (Day 1-3):
┌─────────────────────────────────┐
│ 모니터링 목표:                  │
│ • Crash rate < 0.1%             │
│ • API latency < 500ms           │
│ • Error rate < 1%               │
│                                 │
│ 액션:                          │
│ • Sentry 실시간 모니터링        │
│ • Mixpanel 이벤트 추적          │
│ • AppStore 리뷰 모니터링        │
│ • 버그 핫픽스 대기 (24시간)     │
└─────────────────────────────────┘

출시 후 1주 (Week 1):
┌─────────────────────────────────┐
│ 분석:                          │
│ • K값 (바이럴 계수) 측정       │
│ • Day 1/7 Retention 계산       │
│ • 주요 기능 사용률              │
│                                 │
│ 개선:                          │
│ • 성능 최적화 (느린 기능)       │
│ • Mixpanel 이벤트 추가          │
│ • Sentry 알림 규칙 설정        │
└─────────────────────────────────┘
```

#### 실행 계획

```
Timeline: 3일
┌──────────────────────────────────┐
│ Day 1: PMM 협력 킥오프           │
│  └─ 기술팀: 스크린샷 준비 시작
│  └─ PMM: ProductHunt 메타 작성
│  └─ QA: 앱스토어 심사 대비 체크
│                                  │
│ Day 2-3: 정책 + 마케팅 자료     │
│  └─ Security: Privacy Policy 검수
│  └─ 기술팀: 앱 녹화 (30초)
│  └─ PMM: 앱스토어 메타 준비
│                                  │
│ Day 4: GTM 자동화 스크립트      │
│  └─ DevOps: gtm-checklist.sh 작성
│  └─ DevOps: CI workflow 추가
│                                  │
└──────────────────────────────────┘
```

#### 영향
- ✅ ProductHunt Day 1 성공 (메타 완벽)
- ✅ AppStore 심사 first-time pass (정책 준수)
- ✅ 출시 후 모니터링 체계 (버그 신속 대응)

#### 성공 지표
```
[ ] Privacy Policy 작성 완료
[ ] Terms of Service 작성 완료
[ ] 스크린샷 5장 이상 준비
[ ] 앱 데모 영상 (30초) 준비
[ ] GTM 체크리스트 자동화 완료
[ ] Sentry + Mixpanel Day 1 활성화 계획 수립
```

---

## 📊 3가지 권고사항 통합 로드맵

| Phase | 권고 1 (보안) | 권고 2 (테스트) | 권고 3 (GTM) | 담당팀 |
|-------|---------------|-----------------|--------------|--------|
| **Week 0 (현재)** | - | E2E 3일 | PMM 협력 2일 | QA, DevOps, PMM |
| **Day 1-2** | Android 암호화 | 유틸리티 테스트 | 정책 문서 | All |
| **Day 2-3** | npm audit | Playwright 5개 | 마케팅 자료 | QA, Security |
| **Day 4** | CORS 수정 | 통합 테스트 | GTM 자동화 | DevOps |
| **Day 5** | 최종 감사 | Coverage 85%+ | 최종 체크 | Security |

**총 소요 시간**: 10일 (병렬 진행)
**출시 예상**: 3주 내 (PM 평가와 일치)

---

## 🎯 최종 의사결정

### 의사결정 1: 출시 필수 보안 게이트
✅ **결정**: Android 암호화 + npm 취약점 0 + CORS 수정은 **출시 전 반드시 완료**
- Timeline: 2-3일
- Owner: Security + Backend + DevOps
- CI Gate: Gate 7 (npm audit), Gate 8 (Android crypto)

### 의사결정 2: E2E 테스트 + 로깅
✅ **결정**: Playwright 3일 + 유틸리티 테스트 2일 **출시 전 착수**
- 회원가입 → 꿈 기록 → 동기화만 커버 (기본)
- 기본 에러 로깅 활성화 (출시 후 추적 가능)
- 보안 E2E (JWT, CORS)는 Phase 1.1에서

### 의사결정 3: 모니터링
⚠️ **결정**: Sentry는 **출시 후 1주 내 추가** (현재 1주는 과도함)
- 출시 전: 기본 logger.error + PII 검증만
- 출시 후: Sentry + Mixpanel (Growth 팀과 협력)

### 의사결정 4: GTM
✅ **결정**: 기술팀은 **스크린샷 + 정책 문서 + 앱 녹화** 3일 내 준비
- PMM은 ProductHunt + AppStore 메타 병렬 작성
- 출시 체크리스트 자동화 (gtm-checklist.sh)

---

## 📋 다음 액션 항목

| 항목 | 담당자 | 일정 | 상태 |
|------|--------|------|------|
| Android 암호화 | Backend | Day 1-2 | ⏳ TODO |
| npm audit | DevOps | Day 1 | ⏳ TODO |
| CORS 수정 | Backend | Day 1 | ⏳ TODO |
| Playwright 설정 | QA | Day 1-3 | ⏳ TODO |
| 유틸리티 테스트 | QA | Day 3-5 | ⏳ TODO |
| Privacy Policy | Security + PMM | Day 2 | ⏳ TODO |
| 스크린샷/영상 | 기술팀 | Day 2-3 | ⏳ TODO |
| GTM 자동화 | DevOps | Day 4 | ⏳ TODO |
| 최종 감사 | Security | Day 5 | ⏳ TODO |

---

## 결론

**Group C (QA, DevOps, Security, PMM)**의 3가지 크로스펑셔널 권고사항:

1. **출시 전 필수 보안 게이트** (2-3일) — Android 암호화 + npm 0 + CORS
2. **최소 모니터링 + E2E 테스트** (5일) — 기본 로깅 + Playwright 5개 시나리오
3. **PMM 협력 + GTM 자동화** (3일) — 정책 + 마케팅 자료 + 출시 체크리스트

**총 10일 병렬 진행 → 3주 내 안전한 출시 가능**

다른 팀의 권고사항 (Group A: 제품/개발, Group B: 사용자/성장)과 조율 후 최종 로드맵 수립.

---

**작성**: Group C Lead (QA + DevOps)
**배포**: Team Lead 검토 및 최종 승인 대기
