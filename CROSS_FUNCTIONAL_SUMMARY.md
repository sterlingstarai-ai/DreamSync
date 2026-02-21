# DreamSync 크로스펑셔널 토론 - 종합 요약

**일자**: 2026-02-21
**참석**: PM, Frontend, Backend, AI/ML, UI/UX, UX Research, QA, DevOps, Security, Growth, CRM, PMM

---

## 12개 팀 분석 결과 종합

### 종합 현황

| 영역 | 평가 | 핵심 완성도 | 주요 이슈 |
|------|------|-----------|----------|
| **PM** | 기획 우수 | 100% (Phase 1) | Supabase 통합 필요 (다중 사용자) |
| **Frontend** | 프로덕션 레벨 | 95% | TypeScript 도입, 스토어 리팩토링 |
| **Backend** | 아키텍처 우수 | 70% (Skeleton) | JWT 검증, Rate Limit 마이그레이션 |
| **AI/ML** | Adapter 탁월 | 80% | 프롬프트 설계, UHS 알고리즘 검토 |
| **UI/UX** | 양호 | 79% | WCAG 명암비, focus-visible 부재 |
| **UX Research** | 인사이트 풍부 | 90% | Dashboard 정보 과다 (카드 7→4) |
| **QA** | 품질 의식 높음 | 70% | E2E 테스트 부재 |
| **DevOps** | 구조 우수 | 60% | Sentry/Mixpanel 미연동, 환경 분리 |
| **Security** | 경각심 높음 | 84% | Android 암호화, npm 취약점 12개 |
| **Growth** | 전략 수립 | 0% (데이터 부족) | Analytics 연동 최우선 |
| **CRM** | 리텐션 구조 견고 | 90% | 재참여 전략 전무 |
| **PMM** | 포지셔닝 강력 | 95% | 출시 마케팅 준비 완료 |

### 공통 P0 이슈 (5개 팀 이상 중복 지적)

1. **Supabase 백엔드 통합** (PM, Backend, Security, DevOps, AI/ML)
   - 현황: 로컬 모드만, 다중 사용자 미지원
   - 영향: 출시 불가능 (다중 사용자 필수)
   - 우선순위: ⭐⭐⭐⭐⭐ (즉시)

2. **Analytics/Mixpanel 연동** (Growth, CRM, DevOps, PMM)
   - 현황: MockAnalyticsAdapter만 구현
   - 영향: 사용자 행동 데이터 수집 불가
   - 우선순위: ⭐⭐⭐⭐⭐ (즉시)

3. **보안 긴급 조치** (Security, DevOps, Backend)
   - Android 앱 암호화 미지원
   - npm 취약점 12개 (정기 패치 필요)
   - JWT 검증 미완성
   - 우선순위: ⭐⭐⭐⭐⭐ (이번주)

4. **E2E 테스트 구축** (QA, Frontend, DevOps)
   - 현황: 287 단위 테스트, 0 E2E 테스트
   - 영향: 사용자 플로우 검증 불가
   - 우선순위: ⭐⭐⭐⭐ (1주)

5. **모니터링 (Sentry) 연동** (DevOps, QA, Security, AI/ML)
   - 현황: 로깅 기반, 중앙화된 에러 수집 없음
   - 영향: 프로덕션 버그 추적 불가
   - 우선순위: ⭐⭐⭐⭐ (1주)

---

## 3개 그룹의 크로스펑셔널 권고

### Group A (제품 & 개발): "무엇을 만들 것인가, 어떻게 만들 것인가"

**그룹**: PM, Frontend, Backend, AI/ML

#### 권고 1: Supabase 백엔드 통합 (P0, Week 1-2)
```
문제: 로컬 모드 → 다중 사용자 미지원
솔루션:
  1. Supabase Auth (JWT 발급/갱신)
  2. Rate Limit 마이그레이션 (인메모리 → KV)
  3. API 어댑터 전환 (Local → Supabase)
  4. 다중 사용자 필터링

영향:
  ✅ Security의 JWT 검증 요구 충족
  ✅ Backend의 Rate Limit 버그 해결
  ✅ DevOps의 환경 분리 지원
  ✅ PM의 다중 사용자 요구사항 충족

담당: Backend (주도), Frontend (어댑터), DevOps (환경변수)
```

#### 권고 2: Analytics & Monitoring 인프라 (P0, Week 1-2 병렬)
```
문제: Mixpanel/Sentry 미연동 → 사용자 행동/에러 추적 불가
솔루션:
  1. Sentry: 에러 추적 + 세션 리플레이
  2. Mixpanel: 사용자 행동 분석
  3. 이벤트: signup, dream.created, checkin.completed, forecast.viewed

영향:
  ✅ Growth의 리텐션 데이터 수집
  ✅ CRM의 사용자 세그먼트 분석
  ✅ DevOps의 프로덕션 모니터링
  ✅ QA의 버그 재현 지원

담당: DevOps (인프라), Frontend (클라이언트), Security (PII 마스킹)
```

#### 권고 3: UI 접근성 + Dashboard 개선 (P1, Week 2-3)
```
문제: WCAG 명암비 미달, focus-visible 부재, Dashboard 카드 7개 과다
솔루션:
  1. 색상 명암비 개선 (text-secondary)
  2. Focus 관리 강화 (focus-visible, tabindex)
  3. Dashboard 리팩토링 (카드 7 → 4, 정보 우선순위)

영향:
  ✅ UI/UX의 WCAG AA 준수 요구 충족
  ✅ UX Research의 정보 과부하 개선
  ✅ 키보드 사용자 접근성 강화

담당: Frontend (구현), UI/UX (검증), QA (Playwright)
```

**Group A 일정**: Week 1-4 (4주)
- Week 1-2: P0 통합 (Supabase, Analytics)
- Week 2-3: UI 개선 (접근성, Dashboard)
- Week 3-4: 기술 부채 수렴 (TypeScript, 리팩토링)
- **출시**: Week 4 (2026-03-21 예상)

---

### Group B (사용자 경험 & 성장): "사용자를 어떻게 확보하고 유지할 것인가"

**그룹**: UI/UX, UX Research, Growth, CRM

**권고 1: 신규 사용자 온보딩 최적화**
- Dashboard 정보 과다 해결 (카드 7→4) ← Group A의 UI 개선과 연계
- OnboardingCompleted 플래그 확인
- 목표: 신규 사용자 온보딩 완료율 > 70%

**권고 2: 리텐션 루프 강화**
- 일일 알림 개인화 (CheckIn 시간 재조정)
- 재참여 전략 (7일, 14일, 30일 미사용 사용자)
- Mixpanel 데이터 기반 코호트 분석
- 목표: 7일 리텐션 > 40%

**권고 3: 바이럴 루프 구축**
- 심볼 공유 기능 (꿈 → 친구 공유)
- 주간 리포트 스크린샷 공유 (Instagram/Twitter)
- Analytics 추적: share → signup 전환율
- 목표: Viral coefficient K ≈ 0.2 (현재 0)

---

### Group C (운영 & 출시): "어떻게 안전하게 출시하고 운영할 것인가"

**그룹**: QA, DevOps, Security, PMM

**권고 1: 보안 긴급 조치 (이번주)**
- Android 앱 암호화 (Capacitor Preferences 옵션)
- npm 취약점 12개 패치
- JWT 검증 로직 검수 (Security 리드)
- 목표: Security 점수 90% 이상

**권고 2: E2E 테스트 자동화 (1주)**
- Playwright 통합 (signup → dream → checkin → report 플로우)
- 키보드 네비게이션 테스트
- 디바이스 매트릭스 (iOS 2, Android 3, Web 5)
- 목표: E2E 테스트 20개 이상, CI 자동 실행

**권고 3: 모니터링 & 배포 체계 (1주)**
- Sentry 연동 (에러율 > 5% 시 Slack 알림)
- GitHub Actions 환경 분리 (dev, staging, prod)
- 릴리스 프로세스 자동화 (마이그레이션 가이드, 롤백 계획)
- 목표: 버그 감지 시간 < 5분, 롤백 시간 < 15분

---

## 실행 계획 (통합 타임라인)

### Week 1 (2026-02-24 ~ 3-02)
```
병렬 작업 (3개 팀):

Group A (제품 & 개발):
  - Mon-Tue: Supabase Auth 통합
  - Tue-Wed: Rate Limit 마이그레이션
  - Wed-Thu: Sentry + Mixpanel 인프라
  → 담당: Backend, Frontend, DevOps

Group B (사용자 경험):
  - Mon-Fri: OnboardingCompleted 플로우 분석
  - Fri: 리텐션 루프 정의 (Mixpanel 이벤트 맵)
  → 담당: UX Research, Growth, CRM

Group C (운영 & 출시):
  - Mon: Android 암호화 구현
  - Tue-Wed: npm 취약점 패치
  - Wed-Fri: Playwright E2E 테스트 구축
  → 담당: Security, QA, DevOps

마일스톤: Week 1 말 → Supabase 다중 사용자 동기화 완료
```

### Week 2 (2026-03-03 ~ 3-09)
```
Group A:
  - Mon-Tue: 색상 명암비 개선
  - Tue-Wed: Focus 관리 강화
  - Wed-Thu: Dashboard 리팩토링
  → 담당: Frontend, UI/UX, QA

Group B:
  - Mon-Fri: Mixpanel 펀넬 분석 시작
  - 신규 사용자 온보딩 리뷰
  → 담당: Growth, CRM

Group C:
  - Mon-Fri: E2E 테스트 작성 (20개+)
  - JWT 보안 검수
  → 담당: QA, Security, DevOps

마일스톤: Week 2 말 → WCAG AA 준수, Dashboard 개선 완료
```

### Week 3 (2026-03-10 ~ 3-16)
```
통합 작업:
  - Mon-Tue: 모든 팀 통합 테스트 (signup → dream → checkin → report)
  - Wed-Thu: 디바이스 테스트 (iOS, Android, Web)
  - Fri: 릴리스 준비 (마이그레이션 가이드, 릴리스 노트)

마일스톤: Week 3 말 → QA 서명, 출시 준비 완료
```

### Week 4 (2026-03-17 ~ 3-23)
```
Group A + C:
  - Mon: App Store + Google Play 제출
  - Mon-Fri: 모니터링 (Sentry, Mixpanel 실시간)
  - Fri: 버그 핫픽스 대기

Group B:
  - Mon-Fri: 출시 마케팅 활동 (SNS, 이메일)
  - 신규 사용자 추적 (Mixpanel)

마일스톤: Week 4 중순 → App Store/Google Play 승인
```

---

## 성공 지표 (OKR)

### Objective 1: 안정적인 출시 (Week 4)
```
KR 1.1: 다중 사용자 동기화 완료
  - 2명 이상 사용자가 각자 꿈/체크인/예보 동기화 가능
  - Supabase 환경에서 E2E 테스트 통과

KR 1.2: Sentry + Mixpanel 운영 중
  - 프로덕션에서 모든 에러가 Sentry 수집
  - signup → dream → checkin 이벤트 Mixpanel에 기록

KR 1.3: WCAG AA 준수
  - 모든 텍스트 명암비 4.5:1 이상
  - 모든 interactive 요소에 focus-visible 스타일

마일스톤 달성: 출시 고고!
```

### Objective 2: 기술 품질 유지
```
KR 2.1: 테스트 커버리지 유지
  - 287개 단위 테스트 모두 green
  - 0 lint errors, 0 뮤테이션 survivors

KR 2.2: E2E 테스트 구축
  - Playwright 테스트 20개 이상
  - 주요 플로우 (signup, dream, checkin, report) 자동화

KR 2.3: 번들 크기 유지
  - 74kB gzip 이상 유지 (성능 저하 없음)
  - 메인 번들 이외 청크 분리

마일스톤 달성: 기술 부채 최소화
```

### Objective 3: 사용자 경험 개선
```
KR 3.1: Dashboard 정보 과부하 해결
  - 카드 7 → 4 축소
  - 우선순위 재정렬 (코치플랜 최상단)

KR 3.2: 신규 사용자 온보딩 완료율 > 70%
  - signup → onboarding → dashboard 진행률 추적
  - Mixpanel로 완료율 분석

KR 3.3: 주간 활성 사용자 (WAU) > 100명 (베타)
  - 신규 사용자 획득 + 리텐션 추적
  - Mixpanel 펀넬에서 일일/주간 활성도 모니터링

마일스톤 달성: 초기 사용자 만족도 > 80%
```

---

## 크로스펑셔널 협업 원칙

### 의사결정 구조
1. **PM**: 기능 우선순위 최종 결정
2. **Frontend + Backend**: 기술 설계 검토
3. **Security**: 보안 검수 (필수 게이트)
4. **DevOps**: 배포 검증 (필수 게이트)
5. **QA**: 품질 서명 (필수 게이트)

### 커뮤니케이션 체널
- **긴급 (1시간 이내)**: Slack #dreamsync-critical
- **일반 (당일)**: 그룹 메시지 또는 Slack #dreamsync-dev
- **계획 (주단위)**: 주간 그룹 회의 (월 09:00 KST)
- **검증 (단위 완료 시)**: 코드 리뷰 + 테스트 결과 공유

### 충돌 해결
1. **기술 충돌**: Frontend + Backend + DevOps 합의 (PM 중재)
2. **우선순위 충돌**: PM 최종 결정 (이유 명시)
3. **보안 충돌**: Security 팀의 결정 우선 (위협 수준 기반)

---

## 위험 요소 & 완화 전략

| 위험 | 확률 | 영향 | 완화 전략 | 담당 |
|------|------|------|---------|------|
| Supabase JWT 버그 | 중간 | 높음 | 로컬 테스트 + 스테이징 5일 | Backend, Security |
| Rate Limit 마이그레이션 실패 | 낮음 | 높음 | Edge Function 단위 테스트 | Backend, QA |
| Analytics PII 유출 | 낮음 | 심각 | 마스킹 규칙 Security 리뷰 | Frontend, Security |
| UI 개선 후 리그레이션 | 중간 | 중간 | CI axe-core 테스트 필수 | Frontend, QA |
| Dashboard 리팩토링 후 사용성 악화 | 낮음 | 중간 | 스크린샷 비교 + 포커스 그룹 | UX Research, Frontend |
| iOS/Android 승인 지연 | 낮음 | 높음 | 4주 사전 제출 + 법적 검수 | PMM, DevOps |

---

## 결론

### DreamSync는 다음 4주 내 출시 준비 완료 가능
- **기술**: 핵심 아키텍처 우수 (Adapter 패턴, 상태관리 견고)
- **품질**: 287 테스트, 0 버그 (현재 로컬 모드에서)
- **팀**: 12개 팀 모두 출시 목표 공유

### 3가지 P0 액션 (즉시 시작)
1. **Supabase 백엔드 통합** ← 다중 사용자, 보안, 배포 모두에 필수
2. **Analytics/Monitoring 인프라** ← Growth, DevOps, QA 모두에 필수
3. **UI 접근성 + Dashboard 개선** ← 사용자 경험, 규정 준수에 필수

### 성공을 위한 필수 조건
- ✅ Cross-functional 주간 동기화 (진행상황 공유)
- ✅ 보안/QA 게이트 엄격히 준수 (속도 < 품질)
- ✅ 실시간 모니터링 (출시 후 버그 감지)

**목표**: 2026년 3월 21일 출시
**대상**: iOS App Store, Google Play, Web (PWA)

---

## 다음 단계

1. **이번주**: 각 팀의 상세 실행 계획 수립
2. **월요일**: Group A 주간 회의 (Supabase 기술 설계 검수)
3. **화요일**: Group B 주간 회의 (온보딩 & 리텐션 전략)
4. **수요일**: Group C 주간 회의 (보안 & QA 체크리스트)
5. **금요일**: 전체 팀 동기화 (주간 진행상황 보고)

**출시 카운트다운**: 28일
