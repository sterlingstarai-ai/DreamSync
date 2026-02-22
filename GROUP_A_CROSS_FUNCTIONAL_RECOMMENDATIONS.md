# Group A 크로스펑셔널 권고사항
## 제품 & 개발 (PM, Frontend, Backend, AI/ML)

**작성일**: 2026-02-21
**팀원**: PM, Frontend Engineer, Backend Engineer, AI/ML Engineer
**대상 독자**: 다른 팀 (UI/UX, UX Research, Growth, CRM, QA, DevOps, Security, PMM)

---

## 요약

Group A는 **"무엇을 만들 것인가, 어떻게 만들 것인가"**에 대해 분석했습니다.

**공통 발견사항**:
- ✅ Phase 1 MVP는 100% 완성 (프로덕션 준비)
- ✅ 기술 아키텍처 견고함 (Adapter 패턴, 테스트 우수)
- 🔧 **3가지 긴급 크로스펑셔널 이슈** 있음

---

## 3가지 최우선 권고사항

### 1️⃣ P0: Supabase 백엔드 통합 마일스톤 설정 (우선도: **CRITICAL**)

#### 문제 정의
- **현황**: 완전 로컬 모드 (Mock AI + Zustand Persist) → 다중 사용자 불가
- **병목**: PM의 출시 3-4주 계획이 Supabase 통합에 달려있음
- **영향**:
  - 기술: Backend의 10개 API 설계가 완성되었으나 실제 구현 미완료
  - 제품: 다중 사용자 공동 작업 불가 (Single-user only)
  - 운영: DevOps의 배포 파이프라인이 데이터 마이그레이션 없이는 불가

#### Group A의 제안

**Phase 2 마일스톤 (2월 27일 - 3월 13일, 2주)**

```
Week 1: 스키마 + 마이그레이션 전략
├─ Supabase 테이블 정의 (5개)
│  ├─ dreams (꿈 기록 + 분석)
│  ├─ daily_logs (체크인)
│  ├─ forecasts (예보)
│  ├─ symbols (개인 심볼 사전)
│  └─ audit_logs (감사 로그)
├─ RLS (Row Level Security) 정책 작성
│  ├─ 사용자는 자신의 데이터만 조회
│  ├─ 관리자만 audit_logs 접근
│  └─ 공개 데이터 (심볼 백과) 예외 처리
├─ 로컬→클라우드 데이터 마이그레이션 스크립트
│  ├─ Capacitor Preferences → Supabase 동기화
│  ├─ 충돌 해결 전략 (Last-Write-Wins)
│  └─ 롤백 계획

Week 2: API 실제 구현
├─ API adapter (api.js) → SupabaseAPIAdapter 완성
├─ Real-time sync (Supabase Realtime) 연동
├─ Offline first: 로컬 우선 → 온라인 복귀 시 동기화
└─ 다중 사용자 동시성 처리 (충돌 해결)
```

#### 다른 팀에 미치는 영향

| 팀 | 의존성 | 액션 |
|----|--------|------|
| **DevOps** | 배포 파이프라인 | Supabase 프로덕션 환경 사전 설정 필요 |
| **QA** | E2E 테스트 | Supabase 테스트 DB + 마이그레이션 검증 시나리오 추가 |
| **Security** | 데이터 암호화 | RLS 검토 + 새로운 보안 요구사항 발생 |
| **PMM** | 출시 일정 | 출시 가능 시점 Supabase 완성도에 따라 조정 |

#### 예상 소요 시간
- **Total**: 2주
- **최적 경로**: 스키마 먼저 → 마이그레이션 → API 구현 (병렬화 가능)

---

### 2️⃣ P1: Analytics/Mixpanel + 모니터링 통합 (우선도: **HIGH**)

#### 문제 정의
- **현황**:
  - Analytics Adapter는 Mock만 구현 (실제 Mixpanel 연동 미완료)
  - DevOps의 모니터링 부재 (Sentry, 에러 추적 없음)
  - Growth, CRM, PMM이 사용자 데이터 분석 불가능

- **영향**:
  - 제품: 사용자 행동 데이터 수집 불가 (리텐션 추적 불가)
  - 성장: 코호트 분석, 퍼널 분석 불가
  - 운영: 프로덕션 에러 모니터링 불가

#### Group A의 제안

**통합 계획 (2월 24일 - 3월 6일, 2주)**

```
Phase A: Mixpanel 통합 (1주)
├─ Events 설계 (사용자 중심 분석을 위해)
│  ├─ dream:recorded (꿈 기록됨)
│  ├─ checkin:completed (체크인 완료)
│  ├─ forecast:viewed (예보 조회)
│  ├─ coach:task_completed (코치 플랜 완료)
│  └─ goal:progress_update (목표 진행)
├─ 민감 데이터 필터 (PII 제거)
│  ├─ dream 원문 절대 전송 금지
│  ├─ 길이/카테고리만 전송
│  └─ 암호화된 userId만 사용
├─ Analytics Adapter 실제 구현
│  ├─ MockAnalyticsAdapter → MixpanelAdapter 전환
│  ├─ 환경변수: VITE_ANALYTICS=mixpanel
│  └─ 사용자 프로필 추적

Phase B: Sentry 모니터링 (1주)
├─ Error tracking
│  ├─ 프로덕션 에러 자동 수집
│  ├─ 소스맵 업로드 (난독화 코드 디버깅)
│  └─ 슬랙 알림
├─ Performance monitoring
│  ├─ 페이지 로드 시간
│  ├─ API 응답 시간
│  └─ 사용자 세션
└─ Release tracking
   ├─ 배포 연계
   ├─ 버전별 에러 추적
   └─ 자동 롤백 정책
```

#### 예상 효과

| 팀 | 이득 | 지표 |
|----|------|------|
| **Growth** | 사용자 획득 분석 | DAU, cohort retention |
| **CRM** | 재참여 전략 수립 | 이탈 위험군 식별 |
| **PMM** | 프로덕션 성능 | 앱 스토어 평점 향상 |
| **DevOps** | 실시간 모니터링 | 평균 응답 시간, 에러율 |

#### 의존성 관리
- **전제**: Supabase 백엔드 진행 중 (이와 병렬 진행 가능)
- **우선 사용자**: Beta 그룹 (Mixpanel 초기 전송)

---

### 3️⃣ P1: AI Edge Function 실제 구현 (우선도: **HIGH**)

#### 문제 정의
- **현황**:
  - Edge Function 3개 모두 스켈레톤 상태 (ai-proxy, rate-limit, audit-log)
  - 현재: Mock AI만 동작 (VITE_AI=mock)
  - Claude API 키는 준비 안 됨 (ANTHROPIC_API_KEY 미설정)

- **영향**:
  - 제품: 실제 AI 분석 품질 검증 불가
  - AI/ML: 프롬프트 튜닝 불가능 (Mock은 패턴 매칭만)
  - 출시: "진정한 AI"를 판매하기 어려움 (Mock이므로)

#### Group A의 제안

**Edge AI 구현 마일스톤 (3월 6일 - 3월 13일, 1주)**

```
Step 1: Claude 설정 (2일)
├─ Anthropic 계정 생성 + API 키 발급
├─ Supabase Secrets에 ANTHROPIC_API_KEY 저장
│  └─ .env에 절대 추가 금지 (보안)
└─ 호출 제한 테스트
   └─ Rate limit 확인 (월 $5 무료 크레딧)

Step 2: ai-proxy 실제 구현 (3일)
├─ handleAnalyzeDream 함수 구현
│  ├─ Dream content → Claude 전송
│  ├─ 프롬프트: "꿈 분석가 페르소나" + 구조화된 출력
│  └─ 응답 검증 (DreamAnalysisSchema)
├─ handleGenerateForecast 함수 구현
│  ├─ 최근 7일 데이터 요약 → Claude 전송
│  ├─ 프롬프트: "웰니스 트렌드 분석가"
│  └─ 응답 검증 (ForecastPredictionSchema)
└─ 에러 처리
   ├─ 토큰 초과 → 입력 자동 축소
   ├─ API 오류 → mock fallback (5회 제한)
   └─ 429 (rate limit) → 서버 정책 존중 (fallback X)

Step 3: 클라이언트 전환 (1일)
├─ 환경변수 변경: VITE_AI=edge
├─ Edge Function URL 설정: VITE_EDGE_FUNCTION_URL
└─ Beta 사용자 테스트 (A/B: mock vs edge)

Step 4: 모니터링 + 튜닝 (진행 중)
├─ 응답 품질 평가 (점수 부여)
├─ 응답 시간 최적화
├─ 프롬프트 반복 개선
└─ 비용 추적 (월 호출 수 × 가격)
```

#### 프롬프트 엔지니어링 (Phase 2+)

AI/ML 팀에서 지속적으로 개선:

```typescript
// 예시: 꿈 분석 프롬프트
const ANALYZE_DREAM_SYSTEM = `
당신은 경험이 풍부한 꿈 분석가입니다.
사용자의 꿈을 심리학적으로 분석합니다.

규칙:
1. 심볼 추출 (1-10개): Jung의 원형론 기반
2. 감정 강도 평가 (1-10)
3. 테마 식별 ("변화", "관계", "두려움" 등)
4. 반성 질문 3개 (사용자 자기 탐색 돕기)
5. 의료/진단 표현 절대 금지

JSON 형식 응답만 가능
`;
```

#### 다른 팀에 미치는 영향

| 팀 | 영향 |
|----|------|
| **QA** | AI 응답의 일관성/품질 테스트 추가 |
| **DevOps** | Edge Function 배포 파이프라인 구축 |
| **Security** | API 키 보안 감사 + 토큰 관리 |
| **PMM** | 마케팅: "실제 AI 분석" 강조 가능 |

#### 비용 추정
- Claude API: 약 $10-30/월 (Beta 사용자 기준, 월 1,000회)
- Supabase Edge: 무료 (100 req/day 포함)

---

## 크로스펑셔널 의존성 맵

```
┌─────────────────────────────────────────────────────────┐
│ Timeline & Dependencies                                 │
├─────────────────────────────────────────────────────────┤
│ 2/24 ─────────────────────────────────────────── 3/13  │
│                                                         │
│ [Week 1] Supabase Schema + Migration                   │
│ ├─→ [concurrent] Mixpanel Integration                 │
│ ├─→ [blocked by] QA: E2E 테스트 시작 대기             │
│ └─→ [blocked by] Security: RLS 검토                   │
│                                                         │
│ [Week 2] API Implementation + Edge AI                  │
│ ├─→ [depends on] Supabase Week 1 완료                │
│ ├─→ [concurrent] Claude 계정 설정 (빠름)             │
│ └─→ [blocks] DevOps: 배포 파이프라인                 │
│                                                         │
│ [Week 3] Beta Testing + Rollout                        │
│ ├─→ [depends on] All Phase 2 완료                     │
│ ├─→ [concurrent] Growth: 분석 시작                    │
│ └─→ [final gate] PMM: 출시 준비                        │
└─────────────────────────────────────────────────────────┘
```

---

## Group A가 다른 팀에 기대하는 사항

### UI/UX, UX Research 팀에게

**요청**: Dashboard 정보 과다 문제 해결
**배경**: UX Research 보고서에서 지적 (카드 7→4 축소)
**Group A의 제안**:
- Frontend는 아키텍처 견고함 (컴포넌트 재사용 가능)
- 레이아웃 변경 시 상태 관리 영향 최소화 (Adapter 패턴 덕분)
- **Action**: UX가 리디자인 → Frontend가 구현 (1-2일 소요)

---

### QA 팀에게

**요청**: E2E 테스트 + 유틸리티 테스트
**배경**: QA 보고서: 현재 287개 유닛 테스트만, E2E 0개
**Group A의 제안**:
- Frontend 구조 명확 (라우팅 + 훅 분리) → E2E 테스트 작성 용이
- Backend API 설계 완성 → 목업 제거 후 실제 API 테스트 가능
- **Critical Path**:
  1. Supabase 스키마 확정 (Backend)
  2. API 목업 생성 (Backend)
  3. E2E 테스트 작성 (QA)
  4. 실제 API 구현 (Backend)

---

### DevOps/SRE 팀에게

**요청**: CI/CD 파이프라인 + 배포 자동화
**배경**: DevOps 보고서: 모니터링 부재, 환경 분리 필요
**Group A의 제안**:
- 환경 분리 용이 (Adapter 패턴 + 환경변수)
  - DEV: `VITE_AI=mock, VITE_BACKEND=local`
  - STAGING: `VITE_AI=edge, VITE_BACKEND=supabase`
  - PROD: 동일 (feature flags로 제어)
- **우선 액션**:
  1. Supabase 프로덕션 환경 설정
  2. Edge Function 배포 파이프라인 (Deno 런타임)
  3. 환경 변수 관리 (Secrets)

---

### Security 팀에게

**요청**: RLS 정책 + Android 암호화 + npm 취약점
**배경**: Security 보고서: 84% (중간~높음 위험도)
**Group A의 제안**:
- Backend의 RLS 정책 설계 완료 (Backend 보고서 참고)
- AI Adapter는 이미 보안 설계 우수
  - ANTHROPIC_API_KEY 클라이언트 번들 노출 0
  - PII 마스킹 구현
  - 민감 필드 자동 제거
- **협력 필요**:
  1. RLS 검토 (Security 팀)
  2. npm 취약점 패치 (DevOps)
  3. Android 암호화 (Frontend)

---

### PMM/Growth/CRM 팀에게

**요청**: Analytics 데이터 + 모니터링
**배경**: PMM의 GTM 전략, Growth의 바이럴 루프, CRM의 리텐션 구조
**Group A의 제안**:
- Mixpanel 통합으로 사용자 행동 데이터 수집
- 권장 이벤트:
  ```
  dream:recorded → checkin:completed → forecast:viewed → coach:task_completed
  (이 플로우가 좋을수록 리텐션 높음)
  ```
- **의존성**: Mixpanel 통합 완료 후 가능 (2월 28일 예상)

---

## 시간 추정 및 우선순위

| 항목 | 소요 | 우선도 | 블로커 | 시작 |
|------|------|--------|--------|------|
| **1. Supabase 통합** | 2주 | **P0** | 없음 | 2/24 |
| **2. Mixpanel + Sentry** | 2주 | **P1** | 없음 (병렬) | 2/24 |
| **3. Edge AI 구현** | 1주 | **P1** | Supabase API (대기 가능) | 3/6 |
| **4. E2E 테스트** | 1주 | **P1** | Supabase API 완성 | 3/6 |
| **5. Beta 롤아웃** | 1주 | **P1** | 1-3 완성 | 3/13 |

---

## 결론

Group A의 기술 기반은 **견고함** (287 tests, 0 errors, 100% mutation cover).

**다음 단계는 "로컬 → 클라우드"로의 대전환**이며, 이는:
- **Supabase 백엔드** (필수, 2주)
- **Analytics + 모니터링** (필수, 2주)
- **Edge AI 실제 구현** (핵심, 1주)

이 3가지가 동시에 진행될 때 **3월 중순 출시 목표 달성 가능**합니다.

다른 팀들의 협력(QA, DevOps, Security, PMM)이 critical path를 결정합니다.

---

**작성**: Group A (PM, Frontend, Backend, AI/ML)
**검토 대상**: 다른 그룹 (B, C)의 피드백 수렴 후 최종 회의
