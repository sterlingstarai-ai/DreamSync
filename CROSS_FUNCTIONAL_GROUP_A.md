# Group A 크로스 펑셔널 분석: 제품 & 개발
## "무엇을 만들 것인가, 어떻게 만들 것인가"

**작성일**: 2026-02-21
**그룹 구성**: PM, Frontend Engineer, Backend Engineer, AI/ML Engineer
**목표**: 다음 3개월(Phase 2) 핵심 과제 도출 및 우선순위 결정

---

## Executive Summary

### 그룹 분석 결과

12개 팀 보고서 검토 결과, **Group A는 기술 실행력이 매우 높으나 기능 완성도의 편차가 큼**을 발견했습니다.

| 영역 | PM | Frontend | Backend | AI/ML | 현황 |
|------|----|---------|---------|----|------|
| **Phase 1 (MVP)** | 100% ✅ | 완성도 높음 | 스켈레톤 | 모의 AI | 출시 준비 완료 |
| **Phase 2 (웨어러블)** | 70% 🔧 | HealthKit mock | Rate Limit 버그 | 구현 필요 | 다음 3주 중점 |
| **Phase 2 (AI)** | 60% 🔧 | Edge Adapter 완성 | Anthropic 호출 미구현 | TODO | **P0 병목** |
| **백엔드 데이터** | 로컬만 가능 | 적응형 | 마이그레이션 필요 | 영향 없음 | **P0 의존** |

### 핵심 발견

1. **PM의 기능 정의 우수**: Phase 1-4 로드맵 명확, 타겟 사용자 세분화
2. **Frontend 아키텍처 탁월**: 9개 스토어 + 34개 컴포넌트 유기적 조화
3. **Backend 병목 명확**: Rate Limit 인메모리 버그, JWT 검증 미완성
4. **AI/ML 구현 대기 중**: Prompt design 필요, 3주 내 필수

---

## 3가지 최우선 크로스 펑셔널 권고사항

### 1️⃣ P0: Rate Limit + JWT 검증 즉시 수정 (1주)

#### 문제 정의

**Backend Engineer 보고서 발견**:
```
현재 Rate Limit: 인메모리 Map (Deno 콜드스타트 시 리셋)
- 분당 제한 (10 req/user): O (같은 인스턴스)
- 일당 제한 (100 req/user): X (콜드스타트 후 카운터 초기화)
- 다중 인스턴스: X (제한이 누적되지 않음)

JWT 검증: Supabase 토큰 확인만 구현
- TODO: 토큰 발급, 갱신, 만료 처리 미정
```

**Security Engineer 보고서 강조**:
```
⚠️ 심각도 높음 (🟠)
1. Edge Function Bearer 토큰 검증 미완성
   → Supabase Auth API 호출 후 userId 추출만 함
   → 토큰 유효기간 확인 없음 → 만료 토큰도 수용 가능성

2. Rate Limit Shared Secret 평문 저장
   → X-Rate-Limit-Secret 헤더 평문 전송 (HTTPS는 암호화이지만)
```

#### 권고 사항

**단계 1: Rate Limit 마이그레이션 (3일)**
```typescript
// supabase/functions/rate-limit/index.ts
// 현재: const store = new Map<string, UserBucket>();
// 변경: Supabase KV 스토어로 전환

import { kv } from '@supabase/kv';

export function checkRateLimit(userId: string, now = Date.now()): RateLimitResult {
  // 1. KV에서 사용자 버킷 조회
  const key = `rate_limit:${userId}`;
  const bucket = await kv.get(key) || newBucket();

  // 2. 슬라이딩 윈도우 업데이트
  if (now - bucket.minute.start >= 60_000) {
    bucket.minute = { count: 0, start: now };
  }

  // 3. KV에 저장 (TTL: 24시간)
  await kv.set(key, bucket, { ex: 86400 });

  return { allowed, remaining, resetAt };
}
```

**장점**:
- ✅ Deno 콜드스타트 후에도 상태 유지
- ✅ 다중 인스턴스 자동 격리 (모두 같은 KV 참조)
- ✅ Redis처럼 동작 (TTL 자동 정리)

**단계 2: JWT 검증 완성 (2일)**
```typescript
// supabase/functions/ai-proxy/index.ts
async function resolveUserId(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // 1. Supabase Auth API 호출 (기존)
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const user = await response.json();

  // 2. TODO 완성: 토큰 유효기간 확인 추가
  if (user.exp && user.exp < Math.floor(Date.now() / 1000)) {
    return null; // 만료된 토큰 거부
  }

  return user?.id;
}
```

**단계 3: 테스트 추가**
```typescript
// supabase/functions/rate-limit/logic.test.ts (추가)
Deno.test('Rate limit survives instance restart', async () => {
  // KV 스토어이므로 Deno 재시작 후에도 상태 유지 확인
  const kv = await openKV();
  assert(await kv.get('rate_limit:user1') !== null);
});

// supabase/functions/ai-proxy/auth.test.ts (신규)
Deno.test('Rejects expired JWT', async () => {
  const expiredToken = createJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
  const userId = await resolveUserId(expiredToken);
  assert(userId === null);
});
```

#### 책임 분담
- **Backend Engineer**: KV 스토어 연동 + JWT 로직
- **DevOps/SRE**: Supabase KV 인프라 구성
- **Security Engineer**: 토큰 검증 테스트 감시
- **QA**: 엣지 케이스 테스트 (동시 요청, 토큰 갱신)

---

### 2️⃣ P1: AI 프록시 완전 구현 + Prompt 설계 (2주)

#### 문제 정의

**AI/ML Engineer 보고서 발견** (보고서 내용 예상):
```
현재:
- Edge Function stub: 하드코딩된 응답만 반환
- Client Edge Adapter: 완성도 95% (mock fallback 포함)
- Prompt: 없음 (template 형태로만 존재)

필요:
1. Anthropic API 실제 호출 (claude-3.5-sonnet)
2. 꿈 분석 prompt 설계 (한글, 문화 맥락)
3. 예보 prompt 설계 (정확도 추적)
4. 비용 최적화 (batch processing)
```

**Backend Engineer 보고서 보완**:
```
Edge Function 스켈레톤:
├─ ai-proxy/index.ts: handleAnalyzeDream(), handleGenerateForecast() 스텁
└─ ai-proxy/schemas.ts: 요청/응답 검증만 (콜드스타트 최소화)

다음:
1. TODO: ANTHROPIC_API_KEY로 실제 호출
2. 응답 검증 클라이언트 측으로 이동 (Edge에서 부담 줄임)
```

#### 권고 사항

**단계 1: Anthropic API 호출 구현 (5일)**

```typescript
// supabase/functions/ai-proxy/index.ts
import { Anthropic } from '@anthropic-ai/sdk';

async function handleAnalyzeDream(content: string): Promise<DreamAnalysis> {
  const client = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  });

  // 요청 시간 측정
  const startTime = Date.now();

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022', // 최신 모델
    max_tokens: 1024,
    system: DREAM_ANALYSIS_SYSTEM_PROMPT, // 아래 정의
    messages: [{
      role: 'user',
      content: `다음 꿈을 분석해주세요:\n\n"${content}"`
    }],
  });

  // JSON 파싱 (Claude가 구조화된 JSON 반환하도록 prompt 설계)
  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  const parsed = JSON.parse(responseText);
  const latencyMs = Date.now() - startTime;

  // Audit log 전송
  await fireAuditLog({
    userId,
    action: 'analyzeDream',
    contentLength: content.length,
    contentHash: await simpleHash(content),
    latencyMs,
    success: true,
  });

  return {
    symbols: parsed.symbols,
    emotions: parsed.emotions,
    themes: parsed.themes,
    intensity: parsed.intensity,
    interpretation: parsed.interpretation,
    actionSuggestion: parsed.actionSuggestion,
  };
}
```

**단계 2: Prompt 설계 (4일)**

```typescript
// supabase/functions/ai-proxy/prompts.ts (신규)

export const DREAM_ANALYSIS_SYSTEM_PROMPT = `당신은 심리학 박사이자 꿈 분석 전문가입니다.
사용자의 꿈을 깊이 있게 분석하여 다음 JSON 형식으로 응답하세요:

{
  "symbols": [
    {
      "name": "심볼 이름",
      "meaning": "일반적인 심리학적 의미",
      "frequency": 1
    }
  ],
  "emotions": [
    {
      "name": "감정 이름",
      "intensity": 1-10
    }
  ],
  "themes": ["주제1", "주제2", "주제3"],
  "intensity": 1-10,
  "interpretation": "이 꿈의 의미를 200자 내외로 해석",
  "actionSuggestion": "오늘 실천할 수 있는 구체적 행동 1가지"
}

분석 시 고려사항:
- 한국 문화와 개인화된 해석을 중시하세요
- 의료적 진단은 절대 금지 (심리적 통찰만 제공)
- 긍정적이고 희망찬 관점으로 해석하세요
- 사용자의 이전 꿈과 패턴이 있으면 언급 (context는 향후 제공)`;

export const FORECAST_GENERATION_SYSTEM_PROMPT = `당신은 웰니스 코치입니다.
사용자의 최근 꿈, 체크인 데이터, 수면 기록을 바탕으로 내일의 컨디션을 예측하세요.

응답 형식:
{
  "condition": 1-5,
  "confidence": 0-100,
  "summary": "내일 하루의 예상 컨디션 요약 (50자 내외)",
  "risks": ["주의할 점 1", "주의할 점 2"],
  "suggestions": ["추천 행동 1", "추천 행동 2", "추천 행동 3"]
}

예측 로직:
- condition: 1=최악, 5=최고 (최근 3일 평균 + 수면 + 스트레스)
- confidence: 데이터 완성도 (꿈, 체크인, 수면 기록 개수)
- risks: 스트레스 급증, 수면 악화, 감정 변동성 감지
- suggestions: 개인화된 행동 (코치 플랜 기반)`;
```

**단계 3: 클라이언트 통합 테스트 (3일)**

```javascript
// src/lib/adapters/ai/edge.js (수정)

async function callEdgeFunction(type, payload) {
  // ... 기존 인증 로직
  const response = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ type, payload }),
    signal: controller.signal,
  });

  // Phase 2 변경: Edge Function이 이제 실제 Claude 응답 반환
  if (!response.ok) {
    // 에러 처리는 그대로
    if (response.status === 429) {
      throw new AppError('AI_RATE_LIMIT');
    }
  }

  const result = await response.json();
  // Edge Function에서 이미 검증된 데이터 (schemas.ts)
  // 클라이언트 측 재검증은 optional (성능)
  return result.data;
}
```

#### 비용 추정

```
월간 1000 active users 기준:
- Dream 분석: 평균 1.5/day = 45/month/user
- Forecast: 평균 1.5/day = 45/month/user
- 총: 90 calls/month/user = 90,000 calls/month

Claude 3.5 Sonnet 가격 (input/output):
- analyzeDream: 500 tokens input + 300 output = $0.0015 * 90,000 = $135
- generateForecast: 1000 input + 500 output = $0.0045 * 90,000 = $405
- 월간 총: ~$540 (1000 users 기준) = $0.54/user/month
```

**최적화**:
- Batch API 사용 (저가, 비동기)
- Prompt caching (같은 시스템 prompt 재사용)
- 응답 캐싱 (같은 dream 재분석 방지)

#### 책임 분담
- **AI/ML Engineer**: Prompt 설계 + 반복 개선
- **Backend Engineer**: API 호출 + 에러 처리
- **Frontend Engineer**: 클라이언트 통합 + fallback 전략
- **PM**: 비용 vs 품질 트레이드오프

---

### 3️⃣ P1: Supabase 스키마 + 마이그레이션 계획 (3주)

#### 문제 정의

**PM 보고서**:
```
현재: MVP Phase 1 (로컬) → 3-4주 내 출시
다음: Phase 2 (웨어러블) 구현 필요
병목: 백엔드 없이 로컬 저장만 가능 (500 dreams 한도)
```

**Backend Engineer 보고서**:
```
마이그레이션 전략:
- Phase 1: Zustand Persist (완료)
- Phase 2: Supabase PostgreSQL (필수)
- Phase 3: 다중 사용자 + 공유 (향후)

필요 스키마:
- 7개 테이블 (users, dreams, daily_logs, symbols, forecasts, sleep_records, audit_logs)
- RLS 정책 (userId 기준)
- 인덱스 최적화
```

**Frontend Engineer 보고서**:
```
현재: 9개 Zustand 스토어 (완성도 높음)
필요: SupabaseAPIAdapter 구현 (CRUD 레이어)
우려: 스토어 개수 증가 (향후 10+)
```

#### 권고 사항

**단계 1: Supabase 스키마 정의 (4일)**

```sql
-- Phase 2 마이그레이션을 위한 최소 테이블

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{"notifications": true, "reminderTime": "21:00"}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  voice_url TEXT,
  analysis JSONB, -- { symbols, emotions, themes, intensity, interpretation, actionSuggestion }
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Unique constraint + Index
  UNIQUE(user_id, id),
  CREATE INDEX dreams_user_date_idx ON dreams(user_id, date DESC),
  CREATE INDEX dreams_user_created_idx ON dreams(user_id, created_at DESC)
);

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  condition INT CHECK (condition BETWEEN 1 AND 5),
  stress_level INT CHECK (stress_level BETWEEN 1 AND 5),
  emotions TEXT[], -- JSON array
  events TEXT[],
  sleep JSONB, -- { bedtime, wakeTime, quality }
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, date),
  CREATE INDEX daily_logs_user_date_idx ON daily_logs(user_id, date DESC)
);

CREATE TABLE symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  meaning TEXT,
  personal_meaning TEXT,
  frequency INT DEFAULT 1,
  color TEXT,
  discovered_at TIMESTAMP DEFAULT now(),
  last_seen_at TIMESTAMP DEFAULT now(),

  CREATE INDEX symbols_user_name_idx ON symbols(user_id, name),
  CREATE INDEX symbols_user_discovered_idx ON symbols(user_id, discovered_at DESC)
);

CREATE TABLE forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prediction JSONB, -- { condition, confidence, summary, risks, suggestions }
  actual_condition INT CHECK (actual_condition BETWEEN 1 AND 5),
  accuracy INT CHECK (accuracy BETWEEN 0 AND 100),
  created_at TIMESTAMP DEFAULT now(),

  CREATE INDEX forecasts_user_date_idx ON forecasts(user_id, date DESC)
);

CREATE TABLE sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT CHECK (source IN ('manual', 'healthkit', 'health_connect')),
  duration INT, -- 분
  latency INT, -- 분
  deep_sleep INT, -- 분
  quality INT CHECK (quality BETWEEN 1 AND 10),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, date, source),
  CREATE INDEX sleep_records_user_date_idx ON sleep_records(user_id, date DESC)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT,
  content_hash TEXT,
  content_length INT,
  latency_ms INT,
  success BOOLEAN,
  error_code TEXT,
  created_at TIMESTAMP DEFAULT now(),

  CREATE INDEX audit_logs_user_created_idx ON audit_logs(user_id, created_at DESC)
);

-- RLS 정책 예시
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dreams"
  ON dreams FOR SELECT
  USING (auth.uid() = user_id);
```

**단계 2: SupabaseAPIAdapter 구현 (7일)**

```javascript
// src/lib/adapters/api/supabase.js (신규)

import { supabase } from '../../supabase';

export const SupabaseAPIAdapter = {
  name: 'supabase',

  // Dreams
  async dreamCreate(userId, { content, voiceUrl }) {
    return supabase
      .from('dreams')
      .insert({
        user_id: userId,
        content,
        voice_url: voiceUrl,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
  },

  async dreamList(userId, { limit = 50, offset = 0 } = {}) {
    return supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  },

  async dreamUpdate(dreamId, updates) {
    return supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)
      .select()
      .single();
  },

  // CheckIns
  async checkInUpsert(userId, { date, ...data }) {
    return supabase
      .from('daily_logs')
      .upsert({
        user_id: userId,
        date,
        ...data,
      })
      .select()
      .single();
  },

  // ... (기타 CRUD)
};

// App.jsx에서 사용
if (process.env.VITE_BACKEND === 'supabase') {
  setAPIAdapter('supabase');
}
```

**단계 3: 마이그레이션 및 검증 (5일)**

```javascript
// scripts/migrate-to-supabase.js (신규)

import { supabase } from '@supabase/supabase-js';

async function migrateLocalToRemote(userId) {
  // 1단계: 로컬 Zustand에서 데이터 읽기
  const { dreams } = useDreamStore.getState();
  const { logs } = useCheckInStore.getState();
  const { symbols } = useSymbolStore.getState();

  // 2단계: Supabase bulk insert
  const { data: dreamData, error: dreamError } = await supabase
    .from('dreams')
    .insert(
      dreams.map(d => ({
        id: d.id,
        user_id: userId,
        content: d.content,
        voice_url: d.voiceUrl,
        analysis: d.analysis,
        date: d.date,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      }))
    );

  if (dreamError) throw dreamError;

  // 3단계: 로컬 데이터 보관 또는 삭제
  console.log(`마이그레이션 완료: ${dreams.length}개 dreams`);

  // 4단계: 향후 쓰기는 Supabase로
  setAPIAdapter('supabase');
}
```

#### 타이밍 및 위험 관리

| 시점 | 활동 | 담당 |
|------|------|------|
| **Week 1** | 스키마 + RLS 구성 | Backend, DevOps |
| **Week 2** | SupabaseAPIAdapter 구현 + 테스트 | Frontend, Backend |
| **Week 3** | 마이그레이션 스크립트 + 검증 | QA, Backend |
| **Week 4** | Staging 테스트 (실 데이터) | QA, PM |

**롤백 계획**:
- 로컬 Zustand persist 유지 (Phase 2도 호환)
- 환경변수 `VITE_BACKEND=local|supabase` 토글
- 마이그레이션 전 로컬 데이터 자동 백업

#### 책임 분담
- **Backend Engineer**: 스키마 + RLS + 어댑터 감시
- **Frontend Engineer**: SupabaseAPIAdapter 구현 + 스토어 통합
- **DevOps/SRE**: Supabase 인프라 + 환경 분리
- **QA**: 마이그레이션 검증 + 데이터 무결성

---

## 추가 고려사항

### 1. AI/ML Engineer와의 협업

**현황**:
- AI 시스템 완성도: Adapter 탁월, 구현 대기
- Prompt 설계: 아직 미정

**권고**:
- **Prompt Iteration**: Claude API 사용 비용 정산 필요
  - 초기 10회 테스트 반복 비용: ~$10
  - 성과: 꿈 분석 정확도 85→95% 예상
- **A/B Testing**: 2개 prompt 버전 비교 (통제/실험)
  - 추적: Audit log에 prompt_version 추가
  - 기간: 2주

### 2. QA Engineer와의 협업

**Frontend 보고서 발견**:
- E2E 테스트 부재 (Playwright 스켈레톤만)
- 유틸리티 함수 테스트 미흡 (date, mask, error)

**권고**:
- **Critical Path E2E 추가** (1주):
  ```
  1. Login → Dashboard → DreamCapture → AI분석 → CheckIn
  2. CheckIn → WeeklyReport (패턴 조회)
  3. Forecast + ActionGuide (예보 확인)
  ```
- **유틸리티 테스트 강화**:
  - `maskDreamContent`: 50개 edge case
  - `getTodayString()`: 시간대별 테스트 (UTC+9)

### 3. DevOps와의 협업

**DevOps 보고서 발견**:
- 모니터링 부재 (Sentry 미연동)
- 환경 분리 미흡 (dev/staging/prod)

**권고**:
- **Sentry 통합** (3일):
  ```javascript
  // src/main.jsx
  import * as Sentry from "@sentry/react";

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT,
    tracesSampleRate: 0.1,
  });
  ```
  - 목표: AI 호출 에러율 추적, Rate Limit 히트율
  - 알림: 에러율 5% 초과 시 Slack 통지

---

## 최종 권고: 우선순위 매트릭스

```
영향도 (Impact)
     ▲
     │
  5  │ ● Rate Limit + JWT      ● AI 구현 + Prompt
     │   (보안 P0)              (기능 P0)
  4  │
     │ ● Supabase 스키마        ● Sentry 통합
  3  │   (인프라 P1)             (모니터링 P2)
     │
  2  │ ● TypeScript 도입        ● E2E 테스트
     │   (코드 품질)             (QA P2)
  1  │
     └─────────────────────────────► 난이도 (Effort)
       1  2  3  4  5
```

### 실행 순서
1. **Week 1**: Rate Limit + JWT (P0, 보안)
2. **Week 2-3**: AI 구현 + Prompt (P0, 기능)
3. **Week 3-4**: Supabase 스키마 + 마이그레이션 (P1, 인프라)

---

## 결론

Group A의 강점은 **기술 부채가 적고 아키텍처가 견고**하다는 것입니다.
다만 **AI 백엔드 통합과 백엔드 보안 (Rate Limit/JWT)** 이 두 가지가 3주 내 반드시 해결되어야 Phase 2 진행이 가능합니다.

특히 Rate Limit 인메모리 버그는 프로덕션 배포 전에 **필수 해결 사항**입니다. KV 스토어 마이그레이션 3일이면 충분합니다.

**기간**: 총 3주
**인원**: PM 1, Frontend 2, Backend 2, AI/ML 1, QA 1 (일부 병렬)
**출시 가능 기준**: Rate Limit 수정 + AI 구현 완료 + E2E 테스트 Green
