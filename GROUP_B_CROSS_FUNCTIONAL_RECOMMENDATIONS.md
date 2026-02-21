# Group B 크로스펑셔널 권고사항
## "사용자를 어떻게 확보하고 유지할 것인가"

**Group 구성**: UI/UX Designer, UX Researcher, Growth Marketer, CRM/Lifecycle
**작성일**: 2026-02-21
**목표**: 사용자 확보 → 초기 경험 → 습관화 → 리텐션의 전체 여정 최적화

---

## Executive Summary

Group B의 4개 팀 분석 결과, **DreamSync는 리텐션 기초는 견고하나 초기 사용자 확보와 일일 활성화 사이의 갭**이 존재합니다.

| 팀 | 핵심 발견 | 영향도 |
|------|-----------|--------|
| **UI/UX** | Dashboard 정보 과다 (7개 카드), focus-visible 부재 | 중간 |
| **UX Research** | 온보딩 양호, CheckIn 30초 달성 가능, 첫 기록→분석 시간 이슈 | 높음 |
| **Growth** | 바이럴 K≈0, Analytics 연동 전무, 리텐션 구조만 견고 | 매우 높음 |
| **CRM** | 생애주기 추적 미흡, 세그먼트 차별화 전략 부재, 알림 3종류만 | 중간-높음 |

**공통 문제**: Onboarding → D1-D7 탐색 단계의 "AHA Moment까지의 시간 지연"

---

## 🎯 Group B 최우선 크로스펑셔널 권고사항 (3가지)

### **Recommendation #1: Dashboard 정보 구조 재설계 (UI/UX + UX Research)**

#### 현황
- Dashboard에 7개 주요 카드 (Forecast, CoachPlan, GoalRecovery, ForecastReview, QuickActions, Stats, RecentDreams)
- "첫 기록 후 AI 분석까지 대기 시간이 체크인 임무감을 떨어뜨림"
- L1(탐색기) 사용자의 정보 과다 노출로 인한 이탈 위험

#### 문제점
1. 신규 사용자: 비어있는 대시보드 + 복잡한 구조 → 혼란
2. 정보 우선순위 불명확: 모든 카드가 동일 시각적 가중치
3. 첫 분석 완료 후 축하/강화 신호 부재

#### 크로스펑셔널 권고안

**1단계: 사용자 단계별 Dashboard 변형**
- L0-L1 사용자: Quick Actions 2개(꿈, 체크인) + "다음 단계" 가이드만
- L2+ 사용자: Forecast + Pattern Alert + Coach Plan + Quick Stats 3개
- Weekly Report / UHS는 별도 페이지로 이동

**2단계: "첫 분석 완료" 마일스톤 강화**
- 분석 완료 시 축하 모달 또는 confetti 애니메이션
- 다음 액션(체크인) 유도

**3단계: 데이터 기반 검증**
- L0-L1 사용자 50명 A/B 테스트: "축약형" vs "현재"
- 측정: D3 리텐션(체크인 완료율), 첫 분석→체크인 전환율
- 목표: D3 리텐션 40% → 55%

#### 실행 일정 & 소유권
- 주차 1: **UI/UX** Mockup + **UX Research** 검증 테스트
- 주차 2-3: **Frontend** 구현
- 주차 4: **Growth + CRM** A/B 테스트

---

### **Recommendation #2: Analytics 연동을 통한 Funnel 파악 (Growth 주도)**

#### 현황
- 바이럴 K≈0, Analytics 연동 전무 (현재 Mock 기반)
- 생애주기 단계 추적 불가능 (L0~L5)
- 사용자 이탈 포인트 불명확

#### 문제점
1. 무맹: MAU가 몇 명인지 모름
2. Funnel 미파악: 회원가입 → 첫 꿈 → 체크인 전환율 불명확
3. 재참여 불가능: 비활동 사용자 타겟팅 불가

#### 크로스펑셔널 권고안

**1단계: Analytics 구현 (Growth)**
- Mixpanel 또는 Amplitude 실제 연동
- 핵심 이벤트: auth_signup, onboarding_complete, dream_create_complete, checkin_complete, app_open, notification_click

**2단계: 핵심 Funnel 정의 & 추적 (Growth + CRM)**

| Funnel | Target | Current |
|--------|--------|---------|
| Signup | 월 500명 | 미측정 |
| Onboarding → 완료 | 80% | 미측정 |
| D1 첫 꿈 | 70% | 미측정 |
| D2 첫 체크인 | 60% | 미측정 |
| D3 리텐션 | 40% | 미측정 |
| D7 리텐션 | 25% | 미측정 |

**3단계: Cohort Analysis (CRM + Growth)**
- 가입월별 리텐션 추이 자동 계산
- Dashboard 변경 후 개선도 측정

**4단계: 이탈 사용자 자동 리타겟팅 (CRM)**
- L4(이탈 위기, 3일 무활동) 자동 감지 → 복귀 알림 발송

#### 실행 일정 & 소유권
- 주차 1: **Growth** Mixpanel 계정 설정
- 주차 2: **Frontend** analytics.js 연동 + 이벤트 구현
- 주차 3: **CRM** Cohort 분석 dashboard 설정
- 주차 4+: 주간 리포트 자동 생성

#### 예상 효과
- 가시성 확보: 측정 기반 의사결정 전환
- 병목 지점 파악: 이탈 포인트 구체화
- 개선 효과 정량화: 각 변경의 실제 영향 측정

---

### **Recommendation #3: 생애주기별 개인화 알림 & 코치 전략 (CRM + UI/UX)**

#### 현황
- 알림 3종류만 존재: 아침 꿈, 저녁 체크인, 주간 리포트
- 모든 사용자에 동일 알림 (07:00 + 21:00)
- 생애주기 단계별 차별화 전략 부재
- 재참여 자동화 없음

#### 문제점
1. 컨텍스트 부재: 제네릭 메시지만 발송
2. 단계별 니즈 미반영: L0은 강한 유도, L3은 지속 동기 필요
3. 이탈 위기 자동화 없음: 비활동 사용자 복귀 플로우 전무

#### 크로스펑셔널 권고안

**1단계: 생애주기 단계별 알림 전략 정의 (CRM)**

| 단계 | 알림 | 메시지 | 빈도 | 목표 |
|------|------|--------|------|------|
| **L0** (신규) | WELCOME | "첫 꿈을 기록해볼까요?" | 즉시 | Onboarding |
| **L1** (탐색) | DAILY | "[이름]님, 오늘 하루는?" | 매일 21:00 | 체크인 습관화 |
| **L1** | MILESTONE | "축하! 3일 연속 기록했어요" | 1회 (조건부) | 심리적 강화 |
| **L2** (활성) | INSIGHT | "패턴: 월요일 스트레스↑" | 주 2회 | 인사이트 가치 |
| **L3** (습관) | WEEKLY | "이번 주 웰니스 리포트 준비" | 주 1회 | 지속 동기 |
| **L3** | PERSONALIZED | "[패턴]에 따른 추천 행동" | 주 1회 | 행동 실험 |
| **L4** (위기) | COMEBACK | "[이름]님, 2일 안 뵙는데..." | 1회 | 복귀 유도 |
| **L4** | INCENTIVE | "스트릭 복구 기회!" | 매 2일 | 루프 재진입 |
| **L5** (이탈) | WIN_BACK | "DreamSync에서 많이 그리워요" | 1회 | 브랜드 유대 |

**2단계: 메시지 개인화 (CRM + Frontend)**
- 최근 기록 있으면 심볼 언급: "어제 본 [심볼]의 의미를..."
- 주간 스트레스 높으면: "이번 주 스트레스가 높으니 산책 어떨까?"
- 컨디션 좋으면: "좋은 컨디션 유지의 비결이 뭐였어요?"

**3단계: 이탈 복귀 플로우 (CRM + Frontend)**
- 14일 무활동 후 앱 진입 시 특별 "환영 돌아오기" 페이지
- 동기 제시: "지난 14일간 당신이 놓친 것들"
- 쉬운 재진입: 미뤄둔 꿈 기록하기 또는 홈으로 이동

**4단계: A/B 테스트 (Growth + CRM)**
- Test A: 현재 알림 (3가지, 모든 사용자 동일)
- Test B: 단계별 맞춤 알림 (위 전략 기반)
- 측정: D7 리텐션, 알림 CTR, 체크인 완료율
- 목표: D7 리텐션 20% → 28%

#### 실행 일정 & 소유권
- 주차 1: **CRM** useLifecycleStore 구현 + 알림 전략 정의
- 주차 2: **Frontend** 알림 로직 구현 + messageBuilder 개발
- 주차 3: **Growth** A/B 테스트 설정
- 주차 4+: 주간 리포트 (알림 CTR, 리텐션)

---

## 📊 종합 평가

| 권고사항 | 난이도 | 효과 | 우선순위 | 의존성 |
|----------|-------|------|---------|--------|
| #1: Dashboard | 중간 | 높음 (+15pp D3) | **P1** | Analytics |
| #2: Analytics | 높음 | 매우 높음 (가시성) | **P0** | 없음 |
| #3: 생애주기 알림 | 높음 | 높음 (+40% D7) | **P1** | Analytics (선택) |

---

## 🤝 협력 모델

**Phase 1 (주 1-2)**: Discovery & Planning
- UI/UX + UX Research: Dashboard Wireframe 작성
- Growth + CRM: Analytics 계획 + Funnel 정의
- 주간 Sync: 월/수 15분

**Phase 2 (주 3-4)**: Implementation
- Frontend: UI 구현 + Analytics SDK 통합
- CRM: useLifecycleStore + 알림 메시지 정의
- UI/UX: 신규 사용자 5명 검증

**Phase 3 (주 5-6)**: Testing
- Growth + Analytics: A/B 테스트 설정
- CRM: 알림 성과 모니터링

**Phase 4 (주 7+)**: Rollout & Monitor
- 전체 사용자 대상 Rollout
- Growth: 주간 성과 리포트

---

## ✅ 성공 지표

**단기 (4주)**
- Analytics 구현 완료
- Dashboard 신규 사용자 프로토타입 검증
- D3 리텐션 기준선 수립

**중기 (8주)**
- Dashboard 후 D3 리텐션 40% → 55%
- Funnel 병목 파악 및 개선
- 생애주기 알림 A/B 결과

**장기 (3개월)**
- D7 리텐션 25% → 35%
- MAU 추이 포지티브
- 세분화된 성장 전략 수립 완료

---

**작성자**: UI/UX Designer (Group B)
**리뷰**: Growth Marketer, UX Researcher, CRM/Lifecycle
**최종 승인 대기**: Team Lead
