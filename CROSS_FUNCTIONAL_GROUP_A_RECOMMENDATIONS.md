# Group A (제품 & 개발) 크로스펑셔널 권고사항

**그룹 구성**: PM, Frontend Engineer, Backend Engineer, AI/ML Engineer
**작성일**: 2026-02-21
**미션**: "무엇을 만들 것인가, 어떻게 만들 것인가"

---

## 개요

Group A는 다른 팀들의 제약조건을 고려하여 **출시 3-4주 내 핵심 기능 안정화** 및 **Phase 2 기술 부채 해결**에 집중합니다.

### 외부 제약사항 종합

| 팀 | 영역 | 제약사항 | 우리의 영향 |
|-----|------|---------|-----------|
| **Security** | Authentication | JWT 미완성, Rate Limit 인메모리 버그 | Phase 1 완성 후 즉시 해결 필요 |
| **QA** | Testing | E2E 테스트 부재 (Playwright 미지원) | 수동 테스트 사이클 길어짐 |
| **DevOps** | Deployment | Sentry/Mixpanel 미연동, 환경 분리 미흡 | 배포 모니터링 불가, 롤백 계획 부재 |
| **UI/UX** | Accessibility | WCAG 명암비 미달, focus-visible 부재 | 컴포넌트 수정 후 재배포 필요 |
| **UX Research** | Information Architecture | Dashboard 정보 과다 (카드 7→4) | 페이지 리팩토링 필요 |
| **Growth** | Analytics | Mixpanel 미연동, 리텐션 구조 데이터 불명 | 사용자 행동 추적 불가 |

---

## 3가지 최우선 크로스펑셔널 권고사항

### 권고사항 1: Supabase 백엔드 통합 (P0, Week 1-2)

**배경**:
- PM: "출시 3-4주 내, 현재 로컬 모드는 다중 사용자 미지원"
- Backend: "Rate Limit 인메모리 버그 → Supabase KV 필수"
- Security: "JWT 검증 미완성 → Supabase Auth 필수"
- DevOps: "환경 분리 없음 → Supabase 환경변수 관리 필수"

**문제점**:
1. 현재 Mock AI + 로컬 Zustand 기반 → 단일 사용자만 지원
2. Edge Function Rate Limit이 인메모리 → 콜드스타트 시 리셋 (프로덕션 부적합)
3. JWT 검증이 `resolveUserId()` TODO 상태 → 보안 취약
4. 다중 사용자 동기화 불가능 → B2B 확장 불가능

**권고사항**:

```
Timeline: Week 1-2
Owner: Backend Engineer (주도) + Frontend Engineer (어댑터 수정)
Scope:
  1. Supabase Auth 통합
     - JWT 발급 (signUp/signIn 후)
     - Bearer 토큰 자동 첨부 (모든 API 요청)
     - 토큰 갱신 로직 (exp 감지)

  2. Rate Limit 마이그레이션 (인메모리 → Supabase KV)
     - supabase/functions/rate-limit/index.ts 수정
     - userId + endpoint 기준 counters
     - TTL 설정 (분당/일당 리셋)

  3. API 어댑터 전환 (Local → Supabase)
     - src/lib/adapters/api.js setAPIAdapter('supabase')
     - Dream/CheckIn/Forecast CRUD를 Supabase로 이동
     - Capacitor Preferences는 로컬 캐시로 유지 (오프라인 지원)

  4. 다중 사용자 필터링
     - 모든 쿼리에 WHERE userId = auth.uid() 적용
     - useAuthStore에서 user.id → Supabase auth().user.id로 변경

Acceptance Criteria:
  - ✅ 2명 이상 사용자가 각자 꿈/체크인 동기화 가능
  - ✅ Rate Limit이 Supabase KV에서 동작 (콜드스타트 후에도)
  - ✅ JWT 토큰 만료 시 자동 갱신
  - ✅ 로컬 캐시는 오프라인 시 사용, 온라인 시 서버와 동기화
  - ✅ 기존 로컬 사용자 데이터 마이그레이션 도구 제공
```

**영향 범위**:
- **Frontend**: 3개 파일 수정 (useAuth 훅, API 어댑터 선택, store 초기화)
- **Backend**: 5개 Edge Function 수정 (AI Proxy JWT 검증, Rate Limit KV 전환, Audit Log)
- **DevOps**: CI/CD 환경변수 추가 (SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET)
- **Security**: JWT 서명 검증 + 토큰 갱신 보안 검토

**병렬 작업**:
- Frontend는 Supabase Adapter 스켈레톤 준비 (Backend와 병렬)
- QA는 E2E 테스트 시나리오 작성 시작 (로그인 → 꿈 기록 → 체크인 → 동기화)

---

### 권고사항 2: Analytics 및 Monitoring 인프라 구축 (P0, Week 1-2 병렬)

**배경**:
- Growth: "Mixpanel 미연동 → 사용자 행동 분석 불가, 리텐션 데이터 수집 불가"
- DevOps: "Sentry 미연동 → 프로덕션 에러 추적 불가, 성능 메트릭 수집 불가"
- CRM: "알림 개인화를 위해 사용자 세그먼트 데이터 필요"
- QA: "버그 재현 시 사용자 세션 리플레이 필요"

**문제점**:
1. MockAnalyticsAdapter만 구현 → 실제 사용자 데이터 0
2. Sentry 미연동 → 프로덕션 버그 감지 불가능
3. Dashboard, DreamCapture 등 에러 토스트만 있음 → 중앙화된 에러 수집 없음
4. 사용자 가입 → 꿈 기록 → 체크인 완료 이벤트 추적 불가

**권고사항**:

```
Timeline: Week 1-2 병렬 (Supabase 통합과 동시)
Owner: DevOps Engineer (인프라) + Frontend Engineer (클라이언트)
Scope:
  Phase 2a: Sentry 에러 추적
    1. npm install --save @sentry/react @sentry/tracing

    2. src/main.jsx에서 Sentry 초기화
       Sentry.init({
         dsn: import.meta.env.VITE_SENTRY_DSN,
         environment: import.meta.env.MODE,
         tracesSampleRate: 1.0,
         integrations: [
           new Sentry.Replay({ maskAllText: true }) // PII 마스킹
         ]
       })

    3. ErrorBoundary에서 Sentry.captureException() 호출

    4. try-catch에서 모든 에러 전송
       catch (err) {
         Sentry.captureException(err);
         showToast('에러가 발생했습니다.');
       }

  Phase 2b: Mixpanel 이벤트 추적
    1. npm install --save mixpanel-browser

    2. 핵심 이벤트 정의:
       - user.signup (email, 시간)
       - user.login (email)
       - dream.created (wordCount, voiceUrl 여부)
       - dream.analyzed (symbolCount, confidence)
       - checkin.completed (emotions 개수, stress level)
       - forecast.viewed (accuracy 점수)
       - checkin_week.completed (진행률)

    3. src/lib/adapters/analytics.js MixpanelAdapter 구현
       - 환경변수: VITE_MIXPANEL_TOKEN
       - setAIAdapter() 처럼 setAnalyticsAdapter() 사용

    4. 각 훅에서 이벤트 발송:
       useDreams.addDream() → trackEvent('dream.created')
       useCheckIn.addLog() → trackEvent('checkin.completed')

  Phase 2c: 성능 모니터링 (선택)
    - Web Vitals (CLS, FCP, LCP)
    - Edge Function 응답시간
    - Capacitor 플러그인 호출 시간

Acceptance Criteria:
  - ✅ 프로덕션에서 모든 에러가 Sentry로 수집
  - ✅ 꿈 기록, 체크인, 예보 이벤트가 Mixpanel에 추적
  - ✅ Sentry 대시보드에서 에러율 추세 확인 가능
  - ✅ Mixpanel 펀넬에서 signup → dream → checkin 전환율 계산 가능
  - ✅ 민감 데이터 (꿈 내용, 이메일) 마스킹 완료
```

**영향 범위**:
- **Frontend**: src/main.jsx, ErrorBoundary, 10개 훅에 이벤트 발송 추가 (총 50줄)
- **DevOps**: GitHub Actions에 환경변수 추가 (VITE_SENTRY_DSN, VITE_MIXPANEL_TOKEN)
- **Security**: PII 마스킹 규칙 검토 (Sentry, Mixpanel 헤더)
- **Growth/CRM**: Mixpanel에서 데이터 분석 시작 가능

**병렬 작업**:
- Growth는 Mixpanel 펀넬 및 코호트 정의 시작
- DevOps는 Sentry 알림 규칙 설정 (에러율 > 5% 시 Slack)

---

### 권고사항 3: UI 접근성 + 정보 구조 개선 (P1, Week 2-3)

**배경**:
- UI/UX: "명암비 WCAG AA 미달, focus-visible 부재 → 접근성 점수 7.5/10"
- UX Research: "Dashboard 정보 과다 → 카드 7개 → 4개 축소 필요"
- Frontend: "현재 컴포넌트는 기능 중심, 접근성 속성 부분적"
- QA: "수동 테스트 시 키보드 내비게이션 확인 불가"

**문제점**:
1. text-secondary 색상이 WCAG AA 기준 (4.5:1) 미만
2. focus-visible 스타일 미정의 → 키보드 사용자 혼동
3. Dashboard에 QuickAction, Statistics, CoachPlan, GoalRecovery, Forecast 등 7개 카드
4. aria-label, role, aria-pressed 등 접근성 속성 부분적 구현
5. Modal focus-trap 있지만, 다른 페이지는 focus 순서 미정의

**권고사항**:

```
Timeline: Week 2-3 (Supabase 완료 후)
Owner: Frontend Engineer (주도) + UI/UX Designer (검증)
Scope:
  Phase 3a: 색상 명암비 개선 (1주)
    1. src/index.css CSS 변수 수정
       --text-secondary: #d1d5db (현재)
       → #a0a5b0 (WCAG AA 4.5:1 이상)

    2. 영향받는 컴포넌트 테스트:
       - Card (보조 텍스트)
       - Input (placeholder)
       - Button (secondary variant)
       - InsightList (설명 텍스트)

    3. 색상 대비 검증 도구
       npm install --save-dev axe-core axe-playwright

    4. CI에 접근성 테스트 추가
       npm run test:a11y

  Phase 3b: Focus 관리 강화 (1주)
    1. 모든 interactive 요소에 focus-visible 추가
       src/index.css
       *:focus-visible {
         outline: 2px solid #7c3aed;
         outline-offset: 2px;
       }

    2. Modal, BottomNav, Card 포커스 트랩 확장
       - Modal: 이미 완성 (유지)
       - Dashboard: 카드 탭 순서 정의 (tabindex 설정)
       - DreamCapture: 입력 필드 → 버튼 순서

    3. 키보드 단축키 (선택)
       - Esc: Modal 닫기 (이미 구현)
       - Tab: 포커스 이동 (기본값)
       - Enter: 제출/실행

    4. Playwright로 키보드 내비게이션 E2E 테스트
       // tests/keyboard-a11y.spec.js
       test('Dashboard navigation with keyboard', async ({ page }) => {
         await page.goto('/');
         await page.keyboard.press('Tab');
         // QuickAction 포커스 확인
         const focused = page.locator(':focus-visible');
         // assert focused element
       })

  Phase 3c: Dashboard 정보 구조 리팩토링 (1주)
    문제: 현재 카드 배치 (우선순위 역)
      1. Greeting + QuickAction (고정)
      2. Statistics (중복)
      3. CoachPlan (중요 ★★★)
      4. GoalRecovery (중요 ★★★)
      5. Forecast (중요 ★★★)
      6. PatternAlerts (중요 ★★★)
      7. UHS Card (참고 정보)

    개선안 (카드 4개):
      1. Greeting + QuickAction
      2. CoachPlan (오늘의 액션 - 가장 위) ← 가장 중요
      3. Forecast (내일 예보 + PatternAlerts 통합) ← 예측 정보
      4. WeeklyProgress (주간 목표 진행률) ← 목표 추적
      5. UHS Card (선택적 접기 가능) ← 참고 정보

    구현:
      - CoachPlan과 PatternAlerts는 별도 섹션이 아닌, Forecast 상단 배지로 표시
      - Statistics는 WeeklyReport로 이동 (자세한 분석 필요한 사용자용)
      - GoalRecovery는 코치 플랜의 일부로 통합 (보정 액션)

    코드 (src/pages/Dashboard.jsx):
      {/* 섹션 1: 인사말 + 액션 */}
      <GreetingSection />
      <QuickActions />

      {/* 섹션 2: 오늘의 액션 (코치 플랜) */}
      {todayCoachPlan && <CoachPlanCard plan={todayCoachPlan} />}

      {/* 섹션 3: 예보 + 경보 */}
      {todayForecast && (
        <ForecastCard
          forecast={todayForecast}
          alerts={patternAlerts}
          isLoading={isGenerating}
        />
      )}

      {/* 섹션 4: 주간 진행 */}
      {goalProgress && <WeeklyProgressCard progress={goalProgress} />}

      {/* 섹션 5: UHS (선택적) */}
      {isUHSEnabled && <UHSCard compact />}

Acceptance Criteria:
  - ✅ 모든 텍스트 명암비 4.5:1 이상 (WCAG AA)
  - ✅ 모든 interactive 요소에 focus-visible 스타일
  - ✅ Dashboard 카드 7 → 4 축소 (정보 과부하 해결)
  - ✅ Playwright 키보드 E2E 테스트 5개 이상
  - ✅ 접근성 검사 도구 CI 통합 (axe-core)
  - ✅ 스크린 리더 테스트 (NVDA/JAWS) 최소 3개 주요 페이지
```

**영향 범위**:
- **Frontend**: src/index.css (색상 변수), Dashboard.jsx 리팩토링, 10개 컴포넌트 접근성 속성 추가
- **UI/UX**: 색상 검증, Dashboard 와이어프레임 재작성
- **QA**: Playwright 키보드 테스트 추가, 스크린 리더 수동 테스트 계획
- **Security**: 접근성 감사 보고서 생성 (WCAG AAA 목표는 아니지만, AA는 필수)

**병렬 작업**:
- QA는 Playwright 키보드 테스트 자동화 시작
- UI/UX는 색상 시스템 정의서 업데이트

---

## Group A 추가 고려사항

### 4. 기술 부채 수렴 (Week 3-4)

**Frontend에서**:
- TypeScript checkJs 도입 (JSDoc 검증 자동화) → 2-3일
- 스토어 간 의존성 리팩토링 (이벤트 기반) → 3-4일
- 스토어 통합 검토 (9개 → 7개) → 1주

**Backend에서**:
- JWT 갱신 로직 완성 → 2-3일
- 충돌 해결 전략 (낙관적 동기화) → 3-4일

**AI/ML에서**:
- 프롬프트 엔지니어링 (꿈 분석 정확도) → 진행 중
- UHS 알고리즘 재검토 → 1주

### 5. Phase 2 준비 (Week 4+)

**Supabase 통합 완료 후 시작**:
- HealthKit/Health Connect 실제 구현 (Mock → 실제 권한 호출)
- 웨어러블 데이터 UI 완성
- Confidence 점수 웨어러블 연동

### 6. 위험 요소 및 완화 전략

| 위험 | 확률 | 영향 | 완화 전략 |
|------|------|------|---------|
| Supabase JWT 토큰 버그 | 중간 | 높음 | 로컬 테스트 + 스테이징 환경 5일 |
| Rate Limit 마이그레이션 실패 | 낮음 | 높음 | Edge Function 테스트 2일 추가 |
| Analytics PII 유출 | 낮음 | 심각 | 마스킹 규칙 Security 리뷰 필수 |
| UI 개선 후 접근성 회귀 | 중간 | 중간 | CI axe-core 테스트 필수 |
| 대시보드 리팩토링 후 사용성 악화 | 낮음 | 중간 | 스크린샷 비교, 포커스 그룹 검토 |

---

## 실행 계획 (Roadmap)

### Week 1 (2026-02-24 ~ 3-02)
- **Mon-Tue**: Supabase Auth 통합 (Backend + Frontend)
- **Tue-Wed**: Rate Limit 마이그레이션 (Backend + DevOps)
- **Wed-Thu**: Sentry + Mixpanel 인프라 (DevOps + Frontend)
- **Fri**: 통합 테스트 + 릴리스 준비
- **Review**: 테스트 287개 모두 green, E2E 15개 통과

### Week 2 (2026-03-03 ~ 3-09)
- **Mon-Tue**: 색상 명암비 개선 + 테스트 (Frontend + UI/UX)
- **Tue-Wed**: Focus 관리 + Playwright 키보드 테스트 (Frontend + QA)
- **Wed-Thu**: Dashboard 리팩토링 + 사용성 검토 (Frontend + UX Research)
- **Fri**: 통합 테스트 + 디바이스 테스트 (iOS/Android)
- **Review**: WCAG AA 준수, 카드 7→4 축소 확인

### Week 3 (2026-03-10 ~ 3-16)
- **Mon-Tue**: 기술 부채 수렴 (모든 팀)
  - TypeScript checkJs
  - 스토어 리팩토링
  - API 마이그레이션 완료
- **Wed-Thu**: 최종 품질 보증
  - E2E 테스트 전체 flow
  - 디바이스 테스트 매트릭스 (iOS 2, Android 3, Web 5)
  - 성능 프로파일링 (LCP, FCP)
- **Fri**: 출시 준비
  - 릴리스 노트 작성
  - 마이그레이션 가이드 (로컬 → Supabase)
  - 스테이징 환경 최종 검증

### Week 4 (2026-03-17 ~ 3-23)
- **출시 (App Store + Google Play + Web)**
- **모니터링 (Sentry, Mixpanel 실시간)**
- **버그 핫픽스 대기**

---

## 성공 지표 (OKR)

### Objective 1: 안정적인 출시
- KR 1.1: Supabase 통합 완료, 2명 이상 사용자 다중 사용 가능
- KR 1.2: Sentry + Mixpanel 연동, 프로덕션 모니터링 시작
- KR 1.3: WCAG AA 준수, 접근성 감사 통과

### Objective 2: 기술 품질 유지
- KR 2.1: 테스트 287개 모두 green, 0 lint errors
- KR 2.2: E2E 테스트 20개 이상, Playwright 키보드 테스트 포함
- KR 2.3: 번들 크기 유지 (74kB gzip 이상)

### Objective 3: 사용자 경험 개선
- KR 3.1: Dashboard 정보 과부하 해결 (카드 7 → 4)
- KR 3.2: 신규 사용자 온보딩 완료율 > 70%
- KR 3.3: 주간 활성 사용자 (WAU) > 100명 (베타 테스트 기준)

---

## 의사결정 사항

### Q1: Supabase vs 자체 백엔드?
**결정**: Supabase (설정된 아키텍처 준수)
- 이유: 이미 Edge Function 스켈레톤 완료, Adapter 패턴 준비됨
- 타임라인: 2주 내 완성 가능

### Q2: Analytics 플랫폼 (Mixpanel vs Amplitude)?
**결정**: Mixpanel (PMM에서 선정)
- 이유: 사용자 세그먼트 + 코호트 분석 우수, 리텐션 분석 강력
- 비용: Startup 플랜 $99/month

### Q3: 접근성 목표 (WCAG AA vs AAA)?
**결정**: WCAG AA (필수) + AAA 부분적
- 이유: AA는 법적 요구사항, AAA는 향후
- 타임라인: AA는 3주 내, AAA는 Q2

### Q4: Phase 2 (웨어러블) 일정?
**결정**: Phase 1 출시 후 4주 내 시작
- 이유: PM 로드맵 기준, 현재 Mock 기반이므로 HealthKit/HealthConnect API 호출만 남음
- 리스크: iOS HealthKit 권한 요청 UI는 Apple 검수 필요

---

## 다른 팀과의 협업 체크리스트

### Security와의 협업
- [ ] JWT 검증 로직 리뷰 (Backend 담당, Security 검수)
- [ ] PII 마스킹 규칙 최종 확인 (Sentry, Mixpanel, Audit Log)
- [ ] npm 취약점 12개 패치 (DevOps와 함께)

### QA와의 협업
- [ ] E2E 테스트 시나리오 정의 (signup → dream → checkin → report)
- [ ] Playwright 키보드 테스트 샘플 제공 (Frontend에서)
- [ ] 수동 테스트 체크리스트 작성 (UI 변경사항)

### UI/UX와의 협업
- [ ] 색상 변수 수정 검증 (모든 컴포넌트 스크린샷)
- [ ] Dashboard 와이어프레임 재확인
- [ ] 스크린 리더 테스트 가이드 제공

### DevOps와의 협업
- [ ] Supabase 프로덕션 환경 설정
- [ ] GitHub Actions 환경변수 추가
- [ ] Sentry + Mixpanel 대시보드 설정

### Growth와의 협작
- [ ] Mixpanel 펀넄 및 코호트 정의 회의
- [ ] Analytics 이벤트 명세 최종 확인
- [ ] 출시 후 리텐션 추적 방법 정의

---

## 결론

Group A (제품 & 개발)의 3가지 최우선 크로스펑셔널 권고사항:

1. **Supabase 백엔드 통합** (P0, Week 1-2)
   - 다중 사용자 지원, Rate Limit 버그 해결, JWT 검증 완성
   - Security, Backend, DevOps와의 밀접한 협력 필수

2. **Analytics & Monitoring 인프라** (P0, Week 1-2)
   - Sentry (에러 추적) + Mixpanel (사용자 행동)
   - Growth, CRM, DevOps의 데이터 요구사항 충족

3. **UI 접근성 + 정보 구조 개선** (P1, Week 2-3)
   - WCAG AA 준수, Dashboard 카드 축소
   - UX Research, UI/UX, QA와의 협력

**출시 목표**: 3-4주 내 안정적인 프로덕션 배포
**기술 부채**: 최소화 (TypeScript, 스토어 리팩토링 병렬 추진)
**모니터링**: 출시 즉시 Sentry + Mixpanel 실시간 추적
