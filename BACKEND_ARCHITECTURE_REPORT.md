# DreamSync 백엔드 아키텍처 분석 보고서

**작성일**: 2026-02-21
**프로젝트**: DreamSync (React + Capacitor 하이브리드 앱)
**상태**: Phase 1 완료 (Local Mode), Phase 2+ Supabase 연동 준비 중

---

## 목차

1. [Executive Summary](#executive-summary)
2. [Edge Function 아키텍처](#edge-function-아키텍처)
3. [API 설계](#api-설계)
4. [데이터 모델 및 마이그레이션](#데이터-모델-및-마이그레이션)
5. [인증/인가](#인증인가)
6. [Rate Limiting](#rate-limiting)
7. [확장성 및 병목](#확장성-및-병목)
8. [오프라인 동기화](#오프라인-동기화)
9. [보안 평가](#보안-평가)
10. [개선 로드맵](#개선-로드맵)
11. [권장사항](#권장사항)

---

## Executive Summary

### 현황
- **아키텍처**: Adapter 패턴 기반 모듈화된 구조 (로컬 ↔ Supabase 전환 가능)
- **현재 모드**: 완전 로컬 모드 (Mock AI + Zustand Persist)
- **Edge Functions**: 3개 서비스 (ai-proxy, rate-limit, audit-log) 스켈레톤 완성
- **데이터 저장소**: Capacitor Preferences (localStorage 대신)
- **테스트 커버리지**: 240 tests, 0 mutation survivors

### 주요 강점
✅ **보안 우선**: ANTHROPIC_API_KEY를 Edge에서만 관리, 클라이언트 번들 노출 0
✅ **모듈화**: Adapter 패턴으로 AI/API/Storage 구현체 쉽게 교체
✅ **오프라인 지원**: syncQueue로 네트워크 복귀 시 자동 동기화
✅ **품질**: 프로퍼티 테스트, 퍼징, CI/CD 강화로 안정성 확보

### 주요 과제
⚠️ **인메모리 Rate Limit**: Deno 콜드스타트 시 리셋됨 (프로덕션 불가)
⚠️ **JWT 검증**: Supabase 토큰 확인만 구현, 발급/갱신 로직 미완성
⚠️ **다중 사용자 미지원**: Phase 1은 단일 사용자 + 로컬 저장
⚠️ **충돌 해결 불가**: 동시 수정 시 Last-Write-Wins 만 지원

---

## Edge Function 아키텍처

### 개요

```
클라이언트 (React)
    ↓
Edge Function Proxy (Deno)
    ├─ ai-proxy: AI 호출 프록시 (LLM API Key 관리)
    ├─ rate-limit: userId 기준 요청 제한
    └─ audit-log: 호출 메타데이터 로깅
    ↓
Supabase Services (Phase 2)
    ├─ Auth API (JWT)
    ├─ Database (PostgreSQL)
    └─ KV Storage (Redis)
```

### 1. AI Proxy (`supabase/functions/ai-proxy/`)

#### 구조
```typescript
POST /ai-proxy {
  "type": "analyzeDream" | "generateForecast",
  "payload": { "content": "..." } | { "recentDreams": [...] }
}
```

#### 요청/응답 스키마 (Deno 네이티브 검증)

**AnalyzeDream 요청**
```typescript
{
  type: "analyzeDream"
  payload: {
    content: string (1-5000 chars)
  }
}
```

**DreamAnalysis 응답**
```typescript
{
  symbols: Symbol[] (1-10 items)
    name: string
    meaning: string
    personalMeaning?: string
    frequency: number
  emotions: Emotion[] (1-5 items)
    name: string
    intensity: 1-10
    color?: string
  themes: string[] (1-5 items)
  intensity: 1-10
  interpretation: string (10-500 chars)
  actionSuggestion?: string
}
```

**GenerateForecast 요청**
```typescript
{
  type: "generateForecast"
  payload: {
    recentDreams?: Dream[]
    recentCheckIns?: CheckIn[]
    avgCondition?: number
    avgStress?: number
  }
}
```

**ForecastPrediction 응답**
```typescript
{
  condition: 1-5
  confidence: 0-100
  summary: string (10-300 chars)
  risks: string[] (0-3 items)
  suggestions: string[] (1-4 items)
}
```

#### 보안 메커니즘

| 계층 | 메커니즘 | 상태 |
|------|---------|------|
| **CORS** | Allow-Origin 화이트리스트 (env: ALLOWED_ORIGINS) | ✅ 구현 |
| **인증** | Bearer 토큰 + Supabase JWT 검증 | ⚠️ 토큰 확인만 구현 |
| **권한** | userId 기준 요청 격리 | ✅ 구현 |
| **Rate Limit** | 분당/일당 제한 (fire-and-forget 호출) | ✅ 스켈레톤 |
| **Audit Log** | 메타데이터만 저장 (원문 절대 금지) | ✅ 스켈레톤 |
| **에러 처리** | 상세 에러 코드 + 로깅 | ✅ 구현 |

#### 현재 상태 (Phase 1)
- ✅ CORS preflight, Bearer 토큰 검증
- ✅ 요청/응답 Zod 스키마 검증 (Deno 인라인)
- ✅ SHA-256 컨텐트 해시 생성
- ⏳ TODO: `handleAnalyzeDream()`, `handleGenerateForecast()` 실제 LLM 호출로 교체
  - 현재: 하드코딩된 응답만 반환
  - Phase 2: `ANTHROPIC_API_KEY` 사용하여 Claude API 호출

#### 에러 처리

```typescript
// CORS 거부
403 { error: { code: 'CORS_FORBIDDEN' } }

// 인증 필요
401 { error: { code: 'AUTH_REQUIRED'|'AUTH_INVALID' } }

// 검증 실패
400 { error: { code: 'VALIDATION_ERROR' } }

// Rate limit 초과
429 { error: { code: 'AI_RATE_LIMIT' } }

// 서버 에러
500 { error: { code: 'SERVER_ERROR'|'AI_PARSE_ERROR' } }
```

---

### 2. Rate Limit (`supabase/functions/rate-limit/`)

#### 제한 정책
| 윈도우 | 한도 | 상태 |
|--------|------|------|
| 분당 | 10 req/user | ✅ |
| 일당 | 100 req/user | ✅ |

#### 구현 (인메모리 Map)

```typescript
store = new Map<userId, {
  minute: { count, start },
  day: { count, start }
}>
```

#### 응답 형식

```typescript
// 성공 (200)
{
  allowed: true,
  remaining: { minute: 9, day: 99 },
  resetAt: { minute: "2026-02-21T10:01:00Z", day: "2026-02-22T00:00:00Z" }
}

// 초과 (429)
{
  allowed: false,
  remaining: { minute: 0, day: 0 },
  resetAt: { ... }
}
```

#### 문제점 및 개선 계획

**현재 문제**
1. **인메모리 저장**: Deno 콜드스타트 시 모든 데이터 리셋
   - 무상태 서비스 모델은 확장 가능하나, Rate Limit은 상태가 필수
   - 현재: 분당 제한만 의미 있음 (일당은 인스턴스별 격리)

2. **분산 환경 미지원**: 다중 인스턴스 실행 시 제한이 누적되지 않음

3. **사용자별 추적 불가**: 토큰 검증 없이 userId만 신뢰

**Phase 2 전환 계획**
- Redis/KV 스토어로 마이그레이션 (Supabase Vector 또는 외부 Redis)
- 토큰 기반 사용자 식별 (JWT userId 추출)
- 슬라이딩 윈도우 알고리즘으로 정교한 제한

---

### 3. Audit Log (`supabase/functions/audit-log/`)

#### 목적
AI 호출 메타데이터만 기록 (원문 절대 금지)

#### 기록 필드

```typescript
ALLOWED_FIELDS = [
  'userId',      // 사용자 ID
  'action',      // 'analyzeDream' | 'generateForecast'
  'contentLength', // 요청 크기
  'contentHash', // SHA-256 해시
  'latencyMs',   // 응답 시간
  'success',     // 성공 여부
  'errorCode',   // 에러 코드
  'timestamp'    // ISO 8601
]
```

#### 민감 필드 필터 (자동 제거)

```typescript
SENSITIVE_FIELDS = [
  'content', 'dreamContent', 'dream', 'text',
  'interpretation', 'meaning', 'personalMeaning',
  'emotions', 'emotionDetails', 'feelings',
  'note', 'healthData', 'sleepData', 'hrvData'
]
```

#### 보안 메커니즘

1. **민감 필드 자동 strip**
   - 요청에 민감 필드 포함 시 경고 로그 출력
   - 모든 민감 필드 제거 후 저장

2. **화이트리스트 모델**
   - ALLOWED_FIELDS에만 있는 필드만 기록
   - 새 필드 추가 시 명시적 승인 필요

3. **공유 시크릿** (X-Audit-Log-Secret 헤더)
   - 환경변수로 설정되지 않으면 모두 허용
   - 프로덕션: Supabase Secrets 관리

#### 현재 상태 (Phase 1)
- ✅ 민감 필드 자동 감지 및 제거
- ✅ 화이트리스트 검증
- ⏳ TODO: Supabase `audit_logs` 테이블에 insert (현재: console.log만)

#### Phase 2 로드맵
```javascript
// Phase 1: console.log
console.log('[audit-log]', JSON.stringify(entry));

// Phase 2: Supabase 저장
await supabase
  .from('audit_logs')
  .insert({
    user_id: entry.userId,
    action: entry.action,
    content_hash: entry.contentHash,
    latency_ms: entry.latencyMs,
    success: entry.success,
    created_at: entry.timestamp
  });
```

---

## API 설계

### 클라이언트-서버 통신 흐름

#### 1. Dream 분석 플로우

```
Client (useDreamStore)
  ├─ analyzeDream(content)
  └─ getAIAdapter() → EdgeAIAdapter | MockAIAdapter
      ├─ callEdgeFunction('analyzeDream', { content })
      │  ├─ getAuthToken() [storage.get('auth')]
      │  ├─ fetch(EDGE_URL, POST, Authorization header)
      │  ├─ 스키마 검증 (DreamAnalysisSchema)
      │  └─ fallback: Mock (성공 시 카운터 리셋)
      └─ useDreamStore.syncSymbolsFromAnalysis()
```

**에러 처리**
```javascript
// AI Adapter (edge.js)
try {
  result = await callEdgeFunction('analyzeDream', { content });
} catch (err) {
  if (err.code === ERROR_CODES.AI_RATE_LIMIT) {
    throw err; // fallback 안 함 (서버 정책 존중)
  }
  fallbackCount++;
  if (fallbackCount > MAX_FALLBACK) {
    throw new AppError('AI 서비스 일시 불가');
  }
  return generateMockDreamAnalysis(content); // mock fallback
}
```

#### 2. Forecast 생성 플로우

```
Client (useForecastStore)
  ├─ generateForecast(params)
  └─ EdgeAIAdapter.generateForecast()
      ├─ callEdgeFunction('generateForecast', payload)
      ├─ Zod 스키마 검증
      └─ fallback: Mock
```

### Adapter 패턴의 강점

| 시나리오 | Phase 1 | Phase 2 |
|---------|---------|---------|
| **AI** | `VITE_AI=mock` | `VITE_AI=edge` |
| **API** | `VITE_BACKEND=local` | `VITE_BACKEND=supabase` |
| **Analytics** | `VITE_ANALYTICS=mock` | `VITE_ANALYTICS=mixpanel` |
| **Storage** | Capacitor Preferences | Supabase + KV |

**주석 처리 불필요** → 환경변수로 런타임 전환

---

## 데이터 모델 및 마이그레이션

### Phase 1: Zustand Persist 모델

#### 데이터 구조

```javascript
// src/store/
useAuthStore.js
  ├─ user: { id, email, name, avatar, passwordHash, settings, ... }
  ├─ isAuthenticated: boolean
  └─ persist 키: 'auth' (Capacitor Preferences)

useDreamStore.js
  ├─ dreams: Dream[]
  │  ├─ id, userId, content, voiceUrl
  │  ├─ date, analysis (DreamAnalysis)
  │  ├─ createdAt, updatedAt
  │  └─ MAX: 500 dreams
  └─ persist 키: 'dream'

useCheckInStore.js
  ├─ logs: CheckIn[]
  │  ├─ id, userId, date
  │  ├─ condition (1-5), stress (1-5)
  │  ├─ emotions[], events[]
  │  └─ sleep: { bedtime, wakeTime, quality }
  └─ persist 키: 'checkin'

useForecastStore.js
  ├─ forecasts: Forecast[]
  │  ├─ id, userId, date
  │  ├─ prediction, actualCondition, accuracy
  │  └─ createdAt
  └─ persist 키: 'forecast'

useSymbolStore.js
  ├─ symbols: Symbol[]
  │  ├─ id, userId, name, category
  │  ├─ meaning, personalMeaning
  │  ├─ frequency, color, emotion
  │  └─ discoveredAt, lastSeenAt
  └─ persist 키: 'symbol'

useSleepStore.js
  ├─ sleepRecords: SleepRecord[]
  │  ├─ id, userId, date, source
  │  ├─ metrics: { duration, latency, deepSleep, quality }
  │  └─ 최대 90일 유지
  └─ persist 키: 'sleep'
```

#### 저장소 메커니즘
- **로컬**: Capacitor Preferences (암호화 가능)
- **상태 머신**: Zustand persist + custom JSON serializer
- **싱글톤**: 앱 초기화 시 전체 상태 로드

### Phase 2: Supabase 마이그레이션 계획

#### 필요한 테이블 및 스키마

```sql
-- Users (Supabase Auth 자동 생성)
auth.users (id, email, created_at, ...)

-- Application tables
CREATE TABLE users (
  id UUID PRIMARY KEY (auth.users.id),
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB,
  onboarding_completed BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE dreams (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  voice_url TEXT,
  analysis JSONB, -- DreamAnalysis 결과
  date DATE NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- 인덱스
  UNIQUE(user_id, id),
  INDEX(user_id, date DESC)
);

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  condition INT (1-5),
  stress_level INT (1-5),
  emotions TEXT[], -- JSON
  events TEXT[],
  sleep JSONB, -- { bedtime, wakeTime, quality }
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, date),
  INDEX(user_id, date DESC)
);

CREATE TABLE symbols (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT,
  meaning TEXT,
  personal_meaning TEXT,
  frequency INT DEFAULT 1,
  color TEXT,
  emotion TEXT,
  discovered_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  INDEX(user_id, discovered_at DESC)
);

CREATE TABLE forecasts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  prediction JSONB, -- ForecastPrediction
  actual_condition INT,
  accuracy FLOAT,
  created_at TIMESTAMP,
  INDEX(user_id, date DESC)
);

CREATE TABLE sleep_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  source TEXT ('manual'|'healthkit'|'health_connect'),
  duration INT, -- 분
  latency INT, -- 분
  deep_sleep INT, -- 분
  quality INT (1-10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, date, source),
  INDEX(user_id, date DESC)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT,
  content_hash TEXT,
  content_length INT,
  latency_ms INT,
  success BOOLEAN,
  error_code TEXT,
  created_at TIMESTAMP,
  INDEX(user_id, created_at DESC)
);
```

#### RLS (Row Level Security) 정책

```sql
-- dreams 테이블
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dreams"
  ON dreams FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dreams"
  ON dreams FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dreams"
  ON dreams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ... (other tables similar)
```

### 마이그레이션 전략 (Phase 1 → 2)

#### 1단계: 스키마 준비 (Week 1)
- Supabase 프로젝트 생성
- PostgreSQL 테이블 생성
- RLS 정책 구성
- 인덱스 최적화

#### 2단계: Adapter 구현 (Week 2-3)
```javascript
// src/lib/adapters/api/supabase.js
export const SupabaseAPIAdapter = {
  async dreamCreate(userId, content) {
    return supabase
      .from('dreams')
      .insert({ user_id: userId, content, ... })
      .select();
  },
  async dreamList(userId, limit = 50) {
    return supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },
  // ... (other CRUD operations)
};
```

#### 3단계: 클라이언트 동기화 (Week 4)
```javascript
// App.jsx 초기화
useEffect(() => {
  // 1. Supabase 인증 확인
  const { data: { session } } = await supabase.auth.getSession();

  // 2. 로컬 ↔ 서버 동기화
  if (session) {
    await syncLocalToRemote(session.user.id);
    // 로컬 구데이터 정리 또는 보관
  }

  // 3. 향후 모든 쓰기는 Supabase로
  setAPIAdapter('supabase');
}, []);
```

#### 4단계: 검증 및 롤백 (Week 5)
- 데이터 무결성 검사
- 충돌 해결 테스트
- 롤백 절차 문서화

#### 다중 사용자 지원 (Phase 3+)
- 현재: 단일 사용자 + 로컬 저장 (user.id는 로컬 생성)
- Phase 2: Supabase Auth 연동 (Real JWT)
- Phase 3: 다중 사용자 + 공유 기능

---

## 인증/인가

### 현재 구현 (Phase 1: 로컬 인증)

#### useAuthStore

```javascript
// 회원가입
signUp({ email, password, name })
  ├─ createCredential(password) → { passwordHash, passwordSalt }
  ├─ generateId() → 로컬 UUID
  └─ persist to Capacitor Preferences

// 로그인
signIn({ email, password })
  ├─ normalizeEmail(email)
  ├─ verifyPassword(user, password) → SHA-256 비교
  └─ set { isAuthenticated: true }

// 로그아웃
signOut()
  └─ set { isAuthenticated: false }
```

#### 토큰 관리 (Edge Adapter)

```javascript
// src/lib/adapters/ai/edge.js
async function getAuthToken() {
  try {
    const primary = await storage.get('auth');
    if (primary?.state?.token) return primary.state.token;
    // ... (fallback to legacy keys)
  } catch {
    return null;
  }
}

// Edge Function 호출
fetch(EDGE_URL, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

### Phase 2: Supabase Auth 연동

#### JWT 기반 인증

```typescript
// Edge Function (ai-proxy/index.ts)
async function resolveUserId(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  // Supabase JWT 검증
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user?.id; // UUID from auth.users
}
```

#### 클라이언트 JWT 갱신

```javascript
// 1. Supabase Auth Session 관리
const { data: { session }, error } =
  await supabase.auth.getSession();

// 2. 토큰 자동 갱신
if (session?.expires_at * 1000 < Date.now()) {
  const { data: { session: refreshed } } =
    await supabase.auth.refreshSession();
  token = refreshed.access_token;
}

// 3. Edge Function 호출
fetch(EDGE_URL, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### 보안 비교

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| **인증 주체** | 로컬 (Capacitor Preferences) | Supabase Auth (JWT) |
| **암호화** | SHA-256 + salt | bcrypt (Supabase 관리) |
| **토큰 유효기간** | 무제한 | 1시간 (configurable) |
| **토큰 갱신** | N/A | Refresh Token 자동 |
| **다중 디바이스** | 지원 안 함 | 지원 (세션 격리) |
| **감사 추적** | audit_logs (로컬) | audit_logs (서버 저장) |

---

## Rate Limiting

### 현재 구현 분석

#### 윈도우 기반 제한

```typescript
// supabase/functions/rate-limit/index.ts
const LIMITS = {
  perMinute: 10,    // 분당
  perDay: 100,      // 일당
};

// 슬라이딩 윈도우 (Fixed Window)
if (now - bucket.minute.start >= MINUTE_MS) {
  bucket.minute = { count: 0, start: now };
}
```

#### 응답 형식
```json
{
  "allowed": true,
  "remaining": {
    "minute": 9,
    "day": 99
  },
  "resetAt": {
    "minute": "2026-02-21T10:01:00Z",
    "day": "2026-02-22T00:00:00Z"
  }
}
```

### 문제점

#### 1. 인메모리 상태 손실

| 상황 | 결과 |
|------|------|
| **정상 요청** | 제한 적용 ✅ |
| **Deno 콜드스타트** | 모든 상태 리셋 ❌ |
| **다중 인스턴스** | 제한이 누적되지 않음 ❌ |

**예시**
```
User A: [Instance 1] 10 reqs/min → OK
        [Instance 2] 10 reqs/min → OK (다른 Map이므로 제한 무시)
실제 합: 20 reqs/min 초과, 정책 위반
```

#### 2. 일당 제한 실질적 불가능
- 콜드스타트 후 new Map 생성 → 일당 카운트 초기화
- 분당 제한만 유의미 (같은 인스턴스 내)

#### 3. 공유 시크릿 인증 부재
```typescript
// 현재
if (!hasValidSharedSecret(req)) {
  return 401; // 하지만 env 설정 없으면 무시
}

// 문제: Rate Limit Function이 공개되면 누구나 호출 가능
```

### Phase 3 개선 계획

#### 전략 1: Supabase KV (즉시)
```javascript
// supabase/functions/rate-limit/index.ts
import { kv } from '@supabase/kv';

const bucket = await kv.get(`user:${userId}:minute`);
await kv.set(`user:${userId}:minute`, count + 1, {
  ex: 60 // 60초 TTL
});
```

**장점**
- Deno 콜드스타트 후에도 상태 유지
- 다중 인스턴스 격리 제거

#### 전략 2: Redis (선택)
```javascript
// 대체: 외부 Redis 또는 Supabase Realtime
const redis = new Redis(Deno.env.get('REDIS_URL'));
await redis.incr(`user:${userId}:minute`);
await redis.expire(`user:${userId}:minute`, 60);
```

#### 전략 3: 데이터베이스 (마지막 수단)
```sql
-- 느림, 하지만 ACID 보장
INSERT INTO rate_limits (user_id, window, count, reset_at)
VALUES ($1, 'minute', 1, NOW() + INTERVAL '1 minute')
ON CONFLICT (user_id, window) DO UPDATE
SET count = count + 1
WHERE reset_at > NOW();
```

### 클라이언트 재시도 정책

```javascript
// src/lib/adapters/ai/edge.js
if (response.status === 429) {
  // Rate limit — fallback 안 함 (서버 정책 존중)
  throw new AppError(
    '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    ERROR_CODES.AI_RATE_LIMIT,
  );
}
```

**권장**: 클라이언트에서 지수 백오프 구현
```javascript
const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
await new Promise(resolve => setTimeout(resolve, delay));
```

---

## 확장성 및 병목

### 데이터 증가에 따른 병목

#### 1. 로컬 스토리지 한계

| 저장소 | 용량 | Phase 1 영향 | Phase 2 대응 |
|--------|------|-------------|------------|
| **Capacitor Preferences** | OS 의존 (일반 10-50MB) | dreams 500개 한도 | 무제한 (Supabase) |
| **localStorage** | 5-10MB | 500 dreams ≈ 2-3MB | N/A |
| **IndexedDB** | 50MB+ | 확장 가능 | 미지원 |

#### 2. Zustand Persist 성능

```javascript
// 현재 구조
useDreamStore.js
  ├─ dreams: [] (500개)
  └─ 매 쓰기마다 전체 상태 직렬화
      └─ 500개 dream 객체 → JSON 변환 → 저장 (수초)
```

**문제**: 꿈 추가 시 500개 전체를 다시 저장 → 지연 누적

**Phase 2 개선**:
```javascript
// Supabase + SWR/TanStack Query
const { data: dreams } = useQuery({
  queryKey: ['dreams', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // 페이지네이션
    return data;
  }
});
```

**장점**
- 필요한 페이지만 로드 (페이지네이션)
- 네트워크 I/O는 병렬 (요청 배치)
- 무한 스크롤 지원

#### 3. 심볼 사전 성능

```javascript
// 현재
useSymbolStore.js
  symbols: Symbol[] (무제한 증가)

// 문제: 신볼 검색 시 O(n) 선형 검색
const found = symbols.find(s => s.name.includes(query));
```

**Phase 2 개선**:
```sql
-- 인덱스 추가
CREATE INDEX symbols_user_name_idx
  ON symbols(user_id, name);

-- 전문 검색 (FTS)
CREATE INDEX symbols_search_idx
  ON symbols USING GiST(to_tsvector('korean', name));
```

### 사용자 증가에 따른 병목

#### 1. Edge Function 콜드스타트

| 시나리오 | 콜드스타트 | 워밍 상태 |
|---------|-----------|---------|
| **Deno** | 500ms-1s | 50ms |
| **Node.js** | 1-2s | 30ms |

**영향**: 첫 요청마다 500ms 지연

**개선**:
- Supabase Functions → Vercel Edge Functions (더 빠름)
- 또는: 나머지 로직은 Node.js 서버에서 처리

#### 2. Rate Limit 동시성

```
동시 요청: 100 users × 10 req/min = 1000 req/min
Rate Limit Function: O(1) 조회 + O(1) 쓰기
  → Deno 인메모리: 1ms (안전)
  → Redis: 5-10ms (네트워크 오버헤드)
```

**권장**: Phase 3에서 Redis로 전환 후 모니터링

#### 3. AI 호출 비용

```
월간 예상 (1000 active users):
  - 평균 1 dream/day = 30 dreams/month
  - 평균 2 forecasts/day = 60 forecasts/month
  - 총: 90 API calls/month/user = 90,000 calls/month

Claude 3.5 Sonnet 가격 (2024):
  - 입력: $0.003/1K tokens
  - 출력: $0.015/1K tokens
  - 예상: dream 분석 ≈ 1000 tokens (input)
           forecast ≈ 2000 tokens (input+output)
           = $2-3/user/month
```

**Cost Optimization**:
- 배치 처리: 아침 6시에 그 날 forecasts 한번에 생성
- 캐싱: 같은 dream 내용 다시 분석 안 함
- 롤링 윈도우: 최근 7일만 유지

---

## 오프라인 동기화

### 현재 구현 (`src/lib/offline/syncQueue.js`)

#### 아키텍처

```
네트워크 상태 감시 (Capacitor Network)
    ↓
오프라인 → enqueue() → state.items[] 저장
온라인 복귀 → flush() → processItem() (Phase 2에서 Supabase API 호출)
```

#### 상태 관리

```javascript
const state = {
  items: [], // [{ id, type, payload, retries, createdAt }, ...]
  isOnline: true,
  listeners: new Set(),
  initialized: false,
  networkListener: any
};
```

#### 큐 작업 타입

```javascript
// 향후 확장
await enqueue({
  type: 'dream:create',
  payload: { content: '...', userId: '...' }
});

await enqueue({
  type: 'checkin:add',
  payload: { date: '2026-02-21', condition: 3, ... }
});

await enqueue({
  type: 'symbol:update',
  payload: { symbolId: '...', personalMeaning: '...' }
});
```

### Phase 2: 실제 동기화 구현

#### Sync Flow

```typescript
// supabase/functions/sync-batch/index.ts
async function processItem(item: QueueItem): Promise<void> {
  switch (item.type) {
    case 'dream:create':
      const dream = await supabase
        .from('dreams')
        .insert({
          user_id: item.payload.userId,
          content: item.payload.content,
          date: new Date().toISOString().split('T')[0],
          created_at: item.payload.createdAt || new Date().toISOString(),
        })
        .select()
        .single();

      // 로컬 ID → 서버 ID 매핑
      await storage.updateDreamId(
        item.payload.localId,
        dream.id
      );
      break;

    case 'checkin:add':
      await supabase
        .from('daily_logs')
        .upsert({
          user_id: item.payload.userId,
          date: item.payload.date,
          condition: item.payload.condition,
          // ... (other fields)
        });
      break;

    // ... (other types)
  }
}
```

### 충돌 해결 전략

#### 문제: 다중 디바이스에서 동시 수정

```
Device A (오프라인): dream.content 수정 → enqueue
Device B (온라인): 같은 dream.content 수정 → 즉시 서버 저장
Device A 복귀: enqueue된 항목 flush → 덮어쓰기 (CONFLICT!)
```

#### 현재 전략: Last-Write-Wins (LWW)

```sql
-- updated_at으로 최신만 유지
UPDATE dreams
SET content = $1, updated_at = NOW()
WHERE id = $2 AND updated_at < NOW();
```

**문제**: 최신이 항상 정답이 아님
- Device A에서 오픈된 draft가 Device B의 변경을 덮어쓸 수 있음

#### 권장: 명시적 동기화

```javascript
// Phase 2: 충돌 감지
case 'dream:create':
  const { data, error } = await supabase
    .from('dreams')
    .insert(dream);

  if (error?.code === 'DUPLICATE') {
    // 이미 존재하는 dream
    // UI에서 사용자에게 선택지 제공:
    // 1. 서버 버전 유지
    // 2. 로컬 버전 덮어쓰기
    // 3. 병합 (manual merge)
    emit('conflict', { local: item.payload, remote: existing });
  }
  break;
```

### 오프라인 배너

```javascript
// src/components/common/OfflineBanner.jsx
export function OfflineBanner() {
  const { isOnline, pendingCount } = useSyncQueue();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-600 text-white p-2">
      오프라인 상태입니다.
      {pendingCount > 0 && ` (${pendingCount}개 항목 대기 중)`}
    </div>
  );
}
```

---

## 보안 평가

### 1. 인증 및 권한 (A)

**현재 상태 (Phase 1)**
- ✅ 로컬 패스워드: SHA-256 + random salt
- ✅ 토큰: Bearer 토큰으로 Edge Function 전달
- ⚠️ JWT 검증: Supabase 토큰 확인만, 발급/갱신 미완성

**Phase 2 개선**
- ✅ Supabase Auth JWT (자동 갱신)
- ✅ RLS 정책 (테이블별 userId 검증)
- ✅ 멀티팩터 인증 (옵션)

### 2. 데이터 보호 (A+)

**암호화**
- ✅ 전송: HTTPS/TLS (Supabase Edge Functions)
- ✅ 저장소: Capacitor Preferences (OS 암호화)
- ⚠️ End-to-End: 없음 (서버 신뢰 모델)

**민감 정보 관리**
- ✅ Dream content는 audit-log에 저장 안 함 (content hash만)
- ✅ 모든 민감 필드 자동 strip (14개 키 확인)
- ⚠️ 클라이언트 로그에 dream content 남을 수 있음 (maskDreamContent 사용)

### 3. API 보안 (A)

**CORS**
- ✅ 화이트리스트 기반 (ALLOWED_ORIGINS env)
- ✅ Origin 검증
- ✅ Preflight 처리 (OPTIONS)

**인증**
- ✅ Bearer 토큰 필수
- ✅ 요청/응답 스키마 검증 (Zod)
- ✅ Fire-and-forget audit log (느린 응답 방지)

**Rate Limiting**
- ⚠️ 분당 제한만 유효 (인메모리 콜드스타트)
- ✅ 초과 시 429 + 에러 코드
- ✅ 클라이언트 fallback 차단 (정책 존중)

### 4. 입력 검증 (A)

```typescript
// Edge Function (ai-proxy/schemas.ts)
validateAnalyzeDreamRequest(payload)
  ├─ payload.content: 1-5000 chars ✅
  ├─ max 10 symbols, 5 emotions, 5 themes ✅
  └─ intensity: 1-10 ✅
```

### 5. 비밀 관리 (A+)

**클라이언트**
- ✅ ANTHROPIC_API_KEY: VITE_ 접두사 없음 (번들 노출 0)
- ✅ 환경변수: .env.local (git ignore)
- ✅ 빌드 검증: `grep -rE 'sk-ant'` → 0 hits

**서버 (Edge Functions)**
- ✅ Supabase Secrets에서만 ANTHROPIC_API_KEY 로드
- ✅ 로그에 키 출력 금지

**배포**
- ⚠️ VITE_EDGE_FUNCTION_URL: 공개 (비밀 아님)
- ✅ RATE_LIMIT_SHARED_SECRET: 환경변수 (Supabase Secrets)
- ✅ AUDIT_LOG_SHARED_SECRET: 환경변수 (Supabase Secrets)

### 6. 감사 추적 (B)

**현재 (Phase 1)**
- ⚠️ console.log만 (프로덕션 불가)
- ✅ 메타데이터: userId, action, latency, success
- ✅ 민감 필드 제거: 14개 키 필터

**Phase 2 개선**
- ✅ Supabase audit_logs 테이블 저장
- ✅ 90일 보관 (GDPR 준수)
- ✅ 검색 가능한 인덱스

### 7. DoS 방어 (B)

**구현**
- ✅ Rate Limit (분당 10, 일당 100)
- ✅ Request 타임아웃 (15초)
- ✅ Payload 크기 제한 (5000 chars for dream)

**미흡**
- ⚠️ DDoS: Edge Function 자동 스케일 (Supabase)
- ⚠️ Slow Loris: 타임아웃만 (타임아웃 단축 권장)

### 8. 의존성 보안 (A)

**공격 벡터**
- ✅ npm packages: Dependabot 자동 업데이트
- ✅ Deno stdlib: Deno 중앙 집중식 관리
- ⚠️ Supabase SDK: 정기 업데이트 필요

---

## 개선 로드맵

### Phase 2 (3개월): Supabase 완전 연동

#### Week 1-2: 스키마 + RLS
- [ ] PostgreSQL 테이블 생성 (users, dreams, daily_logs, ...)
- [ ] RLS 정책 (userId 검증)
- [ ] 인덱스 최적화 (created_at, date DESC)
- [ ] 연결 풀 설정 (pgBouncer)

#### Week 3-4: Edge Function 완성
- [ ] AI Proxy: Anthropic API 호출 (stub → 실제)
- [ ] Rate Limit: Redis/KV 전환
- [ ] Audit Log: Supabase insert 구현
- [ ] 테스트 추가

#### Week 5-6: 클라이언트 어댑터
- [ ] SupabaseAPIAdapter 구현 (CRUD)
- [ ] 로컬 ↔ 원격 동기화
- [ ] 충돌 해결 UI

#### Week 7-8: 검증 + 롤백
- [ ] 데이터 마이그레이션 테스트
- [ ] 성능 벤치마크
- [ ] 롤백 절차 문서화

### Phase 3 (2개월): 다중 사용자 + 공유

#### 기능
- [ ] 사용자 초대 (이메일)
- [ ] Dream 공유 (읽기 권한)
- [ ] 팀 기반 분석
- [ ] 통지 시스템 (Supabase Realtime)

#### 인프라
- [ ] WebSocket (Realtime 구독)
- [ ] 캐싱 (Redis)
- [ ] 모니터링 (Sentry)

### Phase 4 (1.5개월): 고급 분석 + AI

#### 기능
- [ ] 관계사 분석 (사주 연동)
- [ ] 패턴 머신러닝
- [ ] 커스텀 심볼 (사용자 정의)
- [ ] 예보 정확도 개선 (Anthropic Batch API)

#### 최적화
- [ ] GraphQL (Hasura)
- [ ] Full-Text Search (PostgreSQL GiST)
- [ ] 동적 순위 학습

---

## 권장사항

### 즉시 (1주일)

1. **Rate Limit 수정**
   ```javascript
   // supabase/functions/rate-limit/index.ts
   // TODO: Supabase KV 통합
   import { kv } from '@supabase/kv';
   ```
   - 콜드스타트 상태 손실 해결
   - 테스트 추가

2. **JWT 검증 완성**
   ```typescript
   // ai-proxy/index.ts
   const userId = await resolveUserId(authHeader);
   // TODO: Supabase Auth JWT 유효기간 확인
   ```

3. **환경변수 체크리스트**
   ```bash
   VITE_EDGE_FUNCTION_URL=https://...functions/v1/ai-proxy
   VITE_AI=edge  # Phase 2 준비
   ```

### 단기 (1개월)

1. **Supabase 프로젝트 생성**
   - 테스트 프로젝트부터 시작
   - RLS 정책 먼저 구성
   - 샘플 데이터 1000 dream 로드

2. **마이그레이션 스크립트**
   ```javascript
   // scripts/migrate-to-supabase.js
   // 로컬 Zustand → Supabase bulk insert
   ```

3. **성능 벤치마크**
   - 로컬 vs 원격 조회 비교
   - 페이지네이션 영향 측정

### 중기 (3개월)

1. **다중 디바이스 지원**
   - 같은 사용자의 여러 기기에서 로그인
   - Realtime 동기화 (WebSocket)

2. **고급 검색**
   - 심볼 전문 검색 (FTS)
   - 날짜 범위 필터

3. **분석 대시보드**
   - 사용률 (Daily Active Users)
   - AI 호출 비용
   - Rate Limit 히트율

### 아키텍처 결정사항

#### 선택 1: Edge Function vs 백엔드 서버
| 선택 | 장점 | 단점 |
|------|------|------|
| **Edge (현재)** | 빠름 (50ms), 서버리스 | 콜드스타트, 상태 관리 어려움 |
| **Node.js** | 따뜻함, 상태 유지 | 비용, 자동 스케일링 불가 |
| **Hybrid** | 최적 | 복잡도 증가 |

**권장**: Edge는 유지, 상태가 필요한 것은 KV 스토어로 분리

#### 선택 2: Realtime 구현
| 선택 | 사용처 |
|------|--------|
| **Supabase Realtime** | Dream 공유, 팀 협업 (Phase 3) |
| **WebSocket** | 직접 구현 (비용) |
| **Polling** | 간단한 동기화 (배터리 소모) |

**권장**: Supabase Realtime (가장 간편)

#### 선택 3: 캐싱 전략
| 계층 | 구현 |
|------|------|
| **클라이언트** | TanStack Query (이미 사용 중) |
| **CDN** | Supabase 자동 (정적 컨텐츠) |
| **서버** | Redis (Phase 3+) |

---

## 결론

### 현재 상태
DreamSync는 **견고한 로컬 모드 아키텍처** 위에 구축되었으며, **Adapter 패턴**으로 Supabase 연동을 깔끔하게 지원합니다. Edge Function 스켈레톤은 **보안 우선** 설계로 ANTHROPIC_API_KEY 노출이 0이며, Rate Limiting과 Audit Logging 기반도 마련되었습니다.

### 즉시 과제 (1-2주)
1. Rate Limit을 KV 스토어로 마이그레이션 (인메모리 콜드스타트 해결)
2. JWT 검증 완성
3. Supabase 테스트 프로젝트 생성

### 장기 비전 (Phase 2-4)
- **다중 사용자 + 공유**: Supabase Auth + RLS
- **Realtime 동기화**: WebSocket 기반
- **고급 분석**: 머신러닝 통합

이 로드맵을 따르면 현재의 로컬 앱을 6개월 내에 **엔터프라이즈급 멀티테넌트 플랫폼**으로 확장할 수 있습니다.

---

**보고서 작성자**: Backend Engineer
**검토 필요**: CTO, DevOps Lead
**분류**: Internal (Architecture)
