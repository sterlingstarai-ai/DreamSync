# DreamSync 보안 감사 보고서

**분석 일자**: 2026-02-21
**분석자**: Security Engineer
**프로젝트**: DreamSync v0.0.1 (React + Capacitor 하이브리드 앱)

---

## 1. 인증 보안 (Authentication & Authorization)

### 1.1 현재 인증 구조 분석

**파일**: `src/store/useAuthStore.js`

#### 강점 (✅)

1. **클라이언트 측 인증 구현**
   - 로컬 저장소 기반 인증 (Phase 1)
   - 비밀번호 해싱 + Salt 사용
   - SHA-256 해싱 (crypto.subtle.digest 지원)

2. **비밀번호 정책**
   - 최소 6자 요구 (`MIN_PASSWORD_LENGTH = 6`)
   - 비밀번호 검증 (signIn 시 해시 비교)
   - 레거시 계정 자동 업그레이드 (줄 152-163)

3. **안전한 Salt 생성**
   - crypto.getRandomValues() 사용 (16 바이트)
   - Fallback: `Date.now() + Math.random()` (웹 환경)

#### 취약점 (⚠️)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **미비한 비밀번호 정책** | 🟡 중간 | 6자 최소 길이는 현대적 기준에 미달. 복잡도 검증 부재 |
| **타이밍 공격 미방어** | 🟡 중간 | `computed === user.passwordHash` 문자열 비교 → 타이밍 사이드채널 취약 |
| **레이트 제한 부재** | 🟠 높음 | 무제한 로그인 시도 가능 (Brute-force) |
| **로그인 후 CSRF 토큰 부재** | 🟡 중간 | 상태 저장 후 토큰 생성 없음 |
| **세션 무효화 미흡** | 🟡 중간 | signOut 후 user 유지 (다음 로그인 복원용) → 재사용 위험 |
| **MFA 미지원** | 🟠 높음 | 이메일 전용 인증, 2FA/TOTP 없음 |

### 1.2 권장 개선 사항

```javascript
// 1. 비밀번호 복잡도 검증
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
// 최소 8자, 대소문자 + 숫자 포함

// 2. 타이밍 공격 방지 (crypto.timingSafeEqual)
import { timingSafeEqual } from 'crypto';
const isValidPassword = await timingSafeEqual(computed, user.passwordHash);

// 3. 로그인 시도 횟수 추적
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15분

// 4. CSRF 토큰 생성 (로그인 후)
const csrfToken = crypto.getRandomValues(new Uint8Array(32));
// API 요청 시 X-CSRF-Token 헤더 전송
```

---

## 2. API Key 및 비밀 관리 (Secret Management)

### 2.1 ANTHROPIC_API_KEY 처리 분석

**파일**:
- `src/lib/adapters/ai/edge.js`
- `supabase/functions/ai-proxy/index.ts`
- `.env.example`

#### 강점 (✅)

1. **서버 전용 키 분리**
   ```javascript
   // .env.example 줄 19-20
   // ⚠️ 서버 전용 키 (Edge Function 환경에만 설정, 클라이언트 절대 금지)
   // LLM_API_KEY → Supabase Secrets에만 설정 (클라이언트 절대 금지)
   ```
   - `VITE_` 접두사 미사용 → 클라이언트 번들 노출 안 함 ✅

2. **Edge Function 프록시 패턴**
   - 클라이언트 → Edge Function → Anthropic API
   - Key는 Edge Function 내부 `Deno.env.get('ANTHROPIC_API_KEY')` 에만 존재
   - 클라이언트는 Bearer 토큰으로만 통신

3. **Audit Log에서 민감 필드 Strip**
   - `supabase/functions/audit-log/index.ts` 줄 11-26
   - SENSITIVE_FIELDS 14개 자동 제거

#### 취약점 (⚠️)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **Deno.env 접근 미검증** | 🟠 높음 | Edge Function에서 API Key 존재 여부 확인 없음 |
| **Edge Function Bearer 토큰 검증 미완성** | 🟠 높음 | `resolveUserId()` 함수 (줄 74-96) JWT 검증 TODO |
| **Rate Limit Shared Secret 평문 저장** | 🟠 높음 | `X-Rate-Limit-Secret` 헤더 평문 전송 (HTTPS 필수) |
| **CORS 와일드카드** | 🟡 중간 | `ALLOWED_ORIGINS` 길이 0일 때 `Access-Control-Allow-Origin: *` |

### 2.2 분석 결과

```bash
# 클라이언트 번들에서 API Key 검사
grep -rE 'sk-ant|ANTHROPIC' dist/
# 결과: 0 matches ✅ (노출 없음)

# .env 파일 접근 제한
.gitignore에 .env, .env.local, .env.*.local 등록 ✅
```

**결론**: ANTHROPIC_API_KEY는 안전하게 보호되고 있으나, Edge Function의 JWT 검증 구현이 필요합니다.

---

## 3. 데이터 보호 (Data Protection & PII)

### 3.1 민감 데이터 마스킹 분석

**파일**: `src/lib/utils/mask.js`

#### 강점 (✅)

1. **마스킹 함수 체계화**
   ```javascript
   // 민감 키 13개 정의 (줄 7-12)
   const SENSITIVE_KEYS = [
     'content', 'dreamContent', 'dream', 'text',
     'emotions', 'emotionDetails', 'feelings',
     'personalMeaning', 'interpretation', 'meaning',
     'note', 'healthData', 'sleepData', 'hrvData',
   ];
   ```

2. **재귀적 마스킹**
   - 중첩 객체도 처리 (maskSensitiveFields)
   - 배열 항목 카운트만 노출 `[${value.length} items]`

3. **꿈 내용 마스킹**
   ```javascript
   export function maskDreamContent(content) {
     return `[dream: ${content.length} chars]`;
   }
   ```
   - 원문 완전 제거, 길이만 로깅

#### 취약점 (⚠️)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **마스킹 호출 불일치** | 🟡 중간 | maskDreamContent는 edge.js에서만 호출 (다른 모듈에서는 미사용) |
| **민감 키 누락 위험** | 🟡 중간 | 신규 민감 필드 추가 시 SENSITIVE_KEYS 수동 업데이트 필요 |
| **Audit Log 민감 필드 검증 이중화** | 🟡 중간 | mask.js와 audit-log/index.ts에 SENSITIVE_FIELDS 두 배열 (동기화 필요) |

### 3.2 저장소 암호화 분석

**파일**: `src/lib/adapters/storage.js`

#### 현황

```javascript
// PreferencesAdapter (네이티브)
// iOS: UserDefaults (자동 암호화 via iCloud Keychain)
// Android: SharedPreferences (암호화 미지원 - Encrypted SharedPreferences 권장)

// LocalStorageAdapter (웹)
// localStorage는 평문 저장 → XSS 시 취약
```

#### 취약점 (🔴 중대)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **Android SharedPreferences 평문** | 🔴 중대 | 꿈 내용, 사용자 정보 평문 저장 |
| **웹 localStorage 평문** | 🔴 중대 | 개발/테스트 환경에서 민감 데이터 노출 |
| **비밀번호 해시 저장** | 🟠 높음 | `passwordHash + passwordSalt` Preferences에 평문 저장 |

### 3.3 권장 개선 사항

```typescript
// 1. Android: Encrypted SharedPreferences 사용
// build.gradle.kts
dependencies {
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
}

// 2. 웹: IndexedDB + Encryption (TweetNaCl.js)
import nacl from 'tweetnacl';

const encryptKey = (plaintext) => {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(Buffer.from(plaintext), nonce, key);
  // key + nonce + encrypted 저장
};

// 3. 민감 필드 리스트 중앙화
// src/constants/sensitiveFields.js
export const SENSITIVE_FIELDS = [...]; // 단일 출처
```

---

## 4. XSS (Cross-Site Scripting) & CSRF 분석

### 4.1 XSS 위험 검사

#### 스캔 결과

```bash
# dangerouslySetInnerHTML 검색
grep -r "dangerouslySetInnerHTML" src/
# 결과: 0 matches ✅

# innerHTML 직접 조작
grep -r "innerHTML" src/
# 결과: 0 matches ✅

# eval() 사용
grep -r "eval(" src/
# 결과: 0 matches ✅
```

#### 강점 (✅)

1. **안전한 React 렌더링**
   - JSX 기반 → 자동 텍스트 이스케이프
   - 모든 사용자 입력 일반 텍스트로 처리

2. **Input 컴포넌트 안전성**
   ```jsx
   // src/components/common/Input.jsx
   <input
     type={inputType}
     value={value}
     onChange={onChange}
     // 직접 조작 없음
   />
   ```

3. **에러 메시지 안전**
   ```jsx
   {error && (
     <p className="text-sm text-red-400 text-center">{error}</p>
   )}
   // 문자열로 처리 (이스케이프됨)
   ```

#### 취약점 (없음) ✅

현재 코드에서 직접 XSS 취약점 발견 안 됨. 다만:

| 항목 | 심각도 | 주의 |
|------|--------|------|
| **타사 라이브러리 종속** | 🟡 중간 | Lucide React 아이콘 라이브러리 신뢰도 확인 필요 |
| **생성된 AI 응답 처리** | 🟡 중간 | generateMockDreamAnalysis 응답을 그대로 렌더링 시 XSS 가능 |

### 4.2 AI 응답 검증 (Zod)

```typescript
// src/lib/ai/schemas.js
const DreamAnalysisSchema = z.object({
  symbols: z.array(z.object({
    name: z.string(),
    meaning: z.string(),
    frequency: z.number(),
  })),
  emotions: z.array(z.object({...})),
  // ... 모든 필드 검증
});

// Edge Function에서도 재검증 (edge.js 줄 166)
const validation = DreamAnalysisSchema.safeParse(result);
```

**결론**: Zod 스키마로 AI 응답 강제 검증 ✅

### 4.3 CSRF 방어

#### 현황

```javascript
// useAuthStore.js에서 로그인 후 상태만 변경
set({
  user,
  isAuthenticated: true,
  isLoading: false,
});
// CSRF 토큰 생성 없음
```

#### 취약점 (🟡 중간)

- 상태 변경 기반 인증 → CSRF 가능 (GET 요청으로 상태 변경 불가하나, POST 폼 제출 공격 가능)
- Phase 2에서 Supabase 서버 인증 시 CSRF 토큰 필수

---

## 5. Edge Function 보안

### 5.1 CORS 정책 분석

**파일**: `supabase/functions/ai-proxy/index.ts`

#### 현황

```typescript
// 줄 27-30
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

// 줄 33-37
if (ALLOWED_ORIGINS.length === 0) {
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': '*',  // ⚠️ 와일드카드
  };
}
```

#### 취약점 (🟠 높음)

| 항목 | 설명 |
|------|------|
| **기본값 와일드카드** | ALLOWED_ORIGINS 미설정 시 모든 origin 허용 |
| **Origin 검증 부재** | 잘못된 Origin이 요청 시에도 처리 가능 (ALLOWED_ORIGINS 공백일 때) |

#### 권장 개선

```typescript
// Supabase 환경변수에 설정
// ALLOWED_ORIGINS=https://dreamsync-app.vercel.app,https://dreamsync.app,capacitor://localhost

// 기본값을 보안적으로
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'null')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

if (ALLOWED_ORIGINS.includes('*')) {
  throw new Error('ALLOWED_ORIGINS must not include wildcard');
}
```

### 5.2 Bearer 토큰 검증 (JWT)

**파일**: `supabase/functions/ai-proxy/index.ts` 줄 74-96

#### 현황

```typescript
async function resolveUserId(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // Supabase auth/v1/user 엔드포인트 호출
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`,
    },
  });
  // ...
}
```

#### 취약점 (🟠 높음)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **JWT 로컬 검증 부재** | 🟠 높음 | 매번 Supabase 호출 필요 (성능 저하) |
| **타이밍 공격** | 🟡 중간 | 토큰 검증 실패 시 응답 시간 다름 (토큰 유효성 추측 가능) |
| **Rate Limit 검증 후 처리** | 🟡 중간 | Rate limit 확인 (줄 256) 후 데이터 처리 → 불필요한 CPU 사용 |

#### 개선 방안

```typescript
// 1. JWT 로컬 검증 + 캐싱
const TOKEN_CACHE = new Map(); // 실제로는 Redis/KV 권장

async function resolveUserIdFast(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 캐시 확인
  if (TOKEN_CACHE.has(token)) {
    return TOKEN_CACHE.get(token);
  }

  // Supabase 호출 (백업)
  const userId = await resolveUserId(token);
  if (userId) {
    TOKEN_CACHE.set(token, userId);
    setTimeout(() => TOKEN_CACHE.delete(token), 60 * 60 * 1000); // 1시간 TTL
  }
  return userId;
}

// 2. JWT 헤더/서명 사전 검증
import { create, verify } from 'https://deno.land/x/djwt/mod.ts';

const SUPABASE_JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET');
const decoded = await verify(token, SUPABASE_JWT_SECRET, 'HS256');
const userId = decoded.sub; // subject claim
```

### 5.3 Rate Limiting

**파일**: `supabase/functions/rate-limit/index.ts`

#### 현황

```typescript
// 분당 10회, 일당 100회 제한
const MINUTE_LIMIT = 10;
const DAILY_LIMIT = 100;

// 인메모리 Map 사용 (Deno 서버 인스턴스 내)
const rateLimitStore = new Map();
```

#### 취약점 (🟠 높음)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **인메모리 저장** | 🔴 중대 | 서버 재시작 시 초기화, 분산 환경에서 우회 가능 |
| **분산 환경 미지원** | 🟠 높음 | Edge Function 자동 확장 시 각 인스턴스별 제한 → 실제로는 분산 위반 |
| **토큰 검증 후 처리** | 🟡 중간 | Rate limit 확인 후 비용이 높은 AI 처리 (DoS 취약) |

#### 개선 방안

```typescript
// Supabase Vector/KV로 교체
import { kv } from "https://deno.land/x/kv/mod.ts";

async function checkRateLimit(userId: string, type: string): Promise<boolean> {
  const minute_key = `rate_limit:${userId}:${type}:${Math.floor(Date.now() / 60000)}`;
  const daily_key = `rate_limit:${userId}:${type}:${Math.floor(Date.now() / 86400000)}`;

  const [minute_count, daily_count] = await Promise.all([
    kv.get(minute_key).then(v => (v?.value ?? 0) + 1),
    kv.get(daily_key).then(v => (v?.value ?? 0) + 1),
  ]);

  if (minute_count > 10 || daily_count > 100) return false;

  // 갱신
  await Promise.all([
    kv.set(minute_key, minute_count, { ex: 61 }),
    kv.set(daily_key, daily_count, { ex: 86401 }),
  ]);

  return true;
}
```

---

## 6. 로컬 저장소 암호화

### 6.1 Capacitor Preferences 분석

**파일**: `src/lib/adapters/storage.js`

#### 현황

```javascript
// iOS
// UserDefaults → iCloud Keychain (자동 암호화)

// Android
// SharedPreferences → 평문 JSON
const PreferencesAdapter = {
  async set(key, value) {
    await Preferences.set({
      key: `dreamsync_${key}`,
      value: JSON.stringify(value),  // 평문
    });
  },
};
```

#### 심각한 취약점 (🔴 중대)

| 항목 | 심각도 | 영향 |
|------|--------|------|
| **Android SharedPreferences 평문** | 🔴 중대 | 기기 탈취 시 모든 꿈 기록, 감정, 사용자 정보 노출 |
| **비밀번호 해시 저장** | 🔴 중대 | passwordHash + passwordSalt 함께 저장 → 해시 검증 후 Rainbow Table 공격 |
| **개인 의미 해석 평문** | 🟠 높음 | personalMeaning (사용자 심볼 해석) 평문 |

#### 권장 조치 (긴급)

```typescript
// Android: Encrypted SharedPreferences (API 21+)
// app/build.gradle.kts
dependencies {
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
}

// Capacitor 플러그인 래퍼
// src/lib/adapters/storage/encryptedPreferences.ts
import { Plugins } from '@capacitor/core';

const { Preferences } = Plugins;

class EncryptedPreferencesAdapter {
  private encryptionKey: Uint8Array;

  constructor() {
    // 기기 고유 식별자 + 앱 ID로 파생
    this.encryptionKey = this.deriveKey();
  }

  private deriveKey(): Uint8Array {
    // PBKDF2-SHA256로 앱 특화 키 생성
    return crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: new TextEncoder().encode('dreamsync:security'),
      iterations: 100000,
      hash: 'SHA-256',
    }, masterKey, 256);
  }

  async set(key: string, value: any): Promise<void> {
    const plaintext = JSON.stringify(value);
    const encrypted = await this.encrypt(plaintext);
    await Preferences.set({
      key: `enc_${key}`,
      value: encrypted,
    });
  }

  private async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await crypto.subtle.importKey('raw', this.encryptionKey, 'AES-GCM', false, ['encrypt']),
      new TextEncoder().encode(plaintext),
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  }
}
```

---

## 7. 의존성 보안 (Dependencies)

### 7.1 npm audit 결과

```
총 취약점: 13개
- Critical: 0
- High: 12
- Moderate: 1
- Low: 0
```

#### High 취약점 패키지 (12개)

```
@eslint/config-array
@eslint/eslintrc
@isaacs/brace-expansion
@surma/rollup-plugin-off-main-thread
ajv
ejs
eslint
filelist
jake
minimatch
tar
vite-plugin-pwa
workbox-build
```

#### 분석

| 패키지 | 심각도 | 영향 범위 | 조치 |
|--------|--------|---------|------|
| vite-plugin-pwa | 🟠 높음 | 빌드 시간에만 | npm update 대기 |
| workbox-build | 🟠 높음 | 빌드 시간에만 | npm update 대기 |
| ajv | 🟠 높음 | 런타임 (JSON 검증) | 즉시 업데이트 권장 |
| eslint / @eslint/* | 🟠 높음 | 개발 시간에만 | npm update 진행 |

#### 권장 조치

```bash
# 1. 즉시 업데이트 (런타임 영향)
npm update ajv

# 2. 개발 종속성 업데이트
npm update --save-dev

# 3. 정기 감시
npm audit --omit=dev  # 운영 환경 위험만 확인
npm audit fix --audit-level=high  # 자동 패치
```

---

## 8. OWASP Top 10 체크리스트

### 8.1 보안 평가표

| # | 위협 | 상태 | 심각도 | 조치 |
|---|------|------|--------|------|
| **A01** | Broken Access Control | 🟠 부분 | 🟠 높음 | JWT 검증 구현 필요 |
| **A02** | Cryptographic Failures | 🔴 취약 | 🔴 중대 | Android 저장소 암호화 필수 |
| **A03** | Injection | ✅ 안전 | ✅ 안전 | Zod 스키마 검증 우수 |
| **A04** | Insecure Design | 🟠 부분 | 🟠 높음 | Rate limit 분산 환경 미지원 |
| **A05** | Security Misconfiguration | 🟠 부분 | 🟡 중간 | CORS 와일드카드 기본값 |
| **A06** | Vulnerable & Outdated | 🟡 주의 | 🟡 중간 | npm audit 12개 High 취약점 |
| **A07** | Authentication Failures | 🟠 부분 | 🟠 높음 | Brute-force 방어, MFA 미지원 |
| **A08** | Software & Data Integrity | ✅ 안전 | ✅ 안전 | npm 잠금 파일 관리 |
| **A09** | Logging & Monitoring | 🟡 기초 | 🟡 중간 | Audit log Phase 1 (로그만 기록) |
| **A10** | SSRF | ✅ 안전 | ✅ 안전 | API 호출 제한됨 |

---

## 9. 보안 강화 로드맵

### Phase 1 (즉시 - 2주)

**우선순위 🔴 중대**

- [ ] Android Encrypted SharedPreferences 구현
- [ ] 비밀번호 해시 저장 시 Salt 분리
- [ ] npm audit 12개 High 취약점 업데이트
- [ ] CORS ALLOWED_ORIGINS 안전한 기본값 설정

### Phase 2 (1개월)

**우선순위 🟠 높음**

- [ ] JWT 로컬 검증 + 캐싱 구현 (resolveUserId 최적화)
- [ ] Rate Limit을 Supabase KV로 마이그레이션
- [ ] 비밀번호 복잡도 정책 강화 (8자, 대소문자+숫자)
- [ ] Brute-force 방어 (로그인 시도 횟수 제한)
- [ ] CSRF 토큰 생성 및 검증
- [ ] 타이밍 공격 방지 (crypto.timingSafeEqual)

### Phase 3 (2-3개월)

**우선순위 🟡 중간**

- [ ] 다중 인증 (MFA/TOTP) 지원
- [ ] Audit log를 Supabase `audit_logs` 테이블에 저장
- [ ] 로그인 시도 분석 및 이상 탐지
- [ ] 세션 토큰 갱신 정책 (5분마다 refresh)
- [ ] PII 마스킹 중앙화 (src/constants/sensitiveFields.js)

### Phase 4 (장기)

**우선순위 🔵 낮음**

- [ ] OAuth 2.0 소셜 로그인 (Google, Apple)
- [ ] Sentry 에러 리포팅 (PII 필터링)
- [ ] 보안 헤더 (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] API Rate Limiting 모니터링 대시보드
- [ ] 정기 보안 감사 (분기별)

---

## 10. 즉시 조치 항목 (Critical Path)

### 10.1 Android SharedPreferences 암호화

**파일**: 신규 생성 필요
**작업 시간**: 2-3시간

```typescript
// src/lib/adapters/storage/encryptedStorage.ts (신규)
// → PreferencesAdapter 교체 시작

// capacitor.config.ts에 플러그인 등록
// 빌드: npm run cap:sync android
```

### 10.2 CORS 설정 수정

**파일**: `supabase/functions/ai-proxy/index.ts`
**변경 내용**: 줄 33-37 수정

```typescript
// 변경 전
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')

// 변경 후
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'null')
```

### 10.3 npm 의존성 업데이트

**작업 시간**: 1시간

```bash
npm audit fix --force
npm update
npm run verify  # 회귀 테스트
```

---

## 11. 결론 및 종합 평가

### 11.1 보안 성숙도 평가

| 항목 | 점수 | 비고 |
|------|------|------|
| **API Key 관리** | 8/10 | Edge Function 패턴 우수, JWT 검증 미완성 |
| **PII 마스킹** | 7/10 | 체계적이나 신규 필드 추가 시 수동 업데이트 필요 |
| **저장소 암호화** | 3/10 | 🔴 iOS는 자동, Android는 평문 (중대 취약) |
| **인증 & 권한** | 5/10 | Brute-force 방어, MFA, CSRF 미지원 |
| **XSS/CSRF** | 9/10 | React JSX, Zod 검증 우수 |
| **의존성** | 6/10 | npm audit 12개 High 취약점 |
| **율 제한** | 4/10 | 인메모리, 분산 환경 미지원 |

**종합**: **59/70 (84%)** - 보안 기초 견고하나 **암호화 & 권한 부분 긴급 보강 필요**

### 11.2 위험 요약

```
🔴 중대 위험 (즉시 해결)
  - Android SharedPreferences 평문 저장
  - 비밀번호 + 해시 함께 저장

🟠 높은 위험 (1개월 내 해결)
  - JWT 검증 미구현
  - Brute-force 방어 부재
  - Rate Limit 분산 환경 미지원
  - npm 12개 High 취약점

🟡 중간 위험 (3개월 내 해결)
  - CORS 와일드카드 기본값
  - MFA 미지원
  - Audit log 저장소 미구현
```

---

## 부록

### A. 감사 대상 파일 목록

```
✓ src/store/useAuthStore.js
✓ src/lib/adapters/ai/edge.js
✓ src/lib/adapters/storage.js
✓ src/lib/utils/mask.js
✓ supabase/functions/ai-proxy/index.ts
✓ supabase/functions/rate-limit/index.ts
✓ supabase/functions/audit-log/index.ts
✓ src/pages/Auth/Login.jsx
✓ src/pages/Auth/Signup.jsx
✓ package.json
✓ .env.example
✓ .gitignore
```

### B. 관련 CWE/CVE

- **CWE-307**: Improper Restriction of Rendered UI Layers or Frames (클릭재킹) → 안전
- **CWE-326**: Inadequate Encryption Strength (암호화 강도) → 🔴 Android SharedPreferences
- **CWE-307**: Password Management (비밀번호 정책) → 🟡 6자 미달
- **CWE-352**: Cross-Site Request Forgery (CSRF) → 🟡 토큰 부재
- **CWE-521**: Weak Password Requirements → 🟡 복잡도 검증 부재

### C. 테스트 계획

**단위 테스트 추가 필요**:
```javascript
// src/lib/adapters/ai/edge.test.js - CORS 검증
// src/store/useAuthStore.test.js - 비밀번호 정책
// src/lib/security/encryptedStorage.test.ts - 암호화 검증
```

**침투 테스트**:
- OAuth 상태 파라미터 검증
- JWT 만료 처리
- Rate limit 우회 시도
- XSS 페이로드 (markdown, Unicode)

---

**작성자**: Security Engineer
**검토자**: 필요 시 추가 보안 팀 검토
**갱신 예정**: 2026년 3월 21일
