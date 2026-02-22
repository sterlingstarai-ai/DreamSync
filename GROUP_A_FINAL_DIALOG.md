# Group A 최종 토론 결과물
## PM + Frontend + Backend + AI/ML 크로스펑셔널 대화

**작성일**: 2026-02-21
**퍼실리테이터**: PM (Product Manager)
**참여**: Frontend Engineer, Backend Engineer, AI/ML Engineer

---

## 토론 문제 4가지 + 해결안

### 문제 1️⃣: Supabase 통합 우선순위
> Backend는 12주 로드맵 제시, Frontend는 어댑터 전환 준비 완료. 어떤 순서로 진행할 것인가?

#### Backend의 입장 (12주 계획)
```
Week 1-2:  스키마 + RLS 정책 설계
Week 3-4:  Edge Function 완성 (ai-proxy, rate-limit, audit-log)
Week 5-6:  클라이언트 어댑터 (SupabaseAPIAdapter)
Week 7-12: 데이터 마이그레이션 + 동시성 처리
```

**Backend 우려**: "한 번에 모든 것을 하면 위험. 단계적 진행 필수."

#### Frontend의 입장 (적응 준비 완료)
```javascript
// 어댑터 패턴 덕분에 실제 구현 대기 중
// VITE_BACKEND=local  → VITE_BACKEND=supabase 로 환경변수만 변경하면 됨
// 즉시 사용 가능한 상태
```

**Frontend 우려**: "기다리는 시간이 낭비. 병렬 진행 원함."

#### 🎯 **PM의 최종 판단**

**실행 전략: "스키마 우선 → API 병렬 진행"**

```
Timeline A: CRITICAL PATH (2주)
├─ Week 1 (2/24-3/2)
│  ├─ Backend: Supabase 테이블 5개 정의 + RLS 정책 (2주 압축)
│  │  ├─ users, dreams, daily_logs, symbols, forecasts 테이블
│  │  ├─ RLS: userId 기반 행 수준 보안
│  │  └─ 데이터 마이그레이션 전략 수립
│  │
│  └─ Frontend: 없음 (Backend 대기 중)
│
├─ Week 2 (3/3-3/9) - 병렬 진행
│  ├─ Backend: SupabaseAPIAdapter 구현
│  │  ├─ CRUD 엔드포인트 (dreams, logs, forecasts)
│  │  ├─ Real-time sync (Supabase Realtime)
│  │  └─ 충돌 해결 로직 (Last-Write-Wins)
│  │
│  └─ Frontend: 어댑터 전환
│     ├─ 로컬 → 클라우드 Fallback (Mock 유지)
│     ├─ E2E 테스트 시작
│     └─ 성능 프로파일링 (API 레이턴시)
│
└─ Week 3 (3/10-3/16)
   ├─ Backend: 데이터 마이그레이션 (로컬 Preferences → Supabase)
   ├─ Frontend: 실제 Multi-user 테스트
   └─ QA: E2E 회귀 테스트
```

**이유**:
1. **Backend의 "12주" = 과도하게 보수적**
   - 스키마는 이미 설계 완료 (DATA_MODEL.md 참고)
   - 테이블 생성 + RLS = 실제로 2-3일
   - "12주"는 레거시 데이터 마이그레이션 + 동시성 처리 포함

2. **출시 일정 (3-4주)에 맞추려면**
   - 스키마: 2월 27일 완료 필수
   - API: 3월 6일 완료 필수
   - 데이터 마이그레이션은 Beta 후 진행 가능

3. **Frontend의 준비 상태 활용**
   - Adapter 패턴이 이미 준비됨
   - Mock 유지 → Supabase 전환 즉시 가능
   - 병렬 진행으로 피드백 루프 가속화

#### 결정: **2주 집약형 + 데이터 마이그레이션 후순위**

---

### 문제 2️⃣: AI 실제 연동
> AI/ML은 프롬프트 설계 필요 지적, Edge Function은 스켈레톤. Claude API 연동 시 사용자 경험 변화는?

#### AI/ML의 입장
```
현재: Mock AI (패턴 매칭)
필요:
1. 프롬프트 시스템 구축 (경험 기반 설계)
2. Claude API 통합 (실제 LLM)
3. 응답 품질 평가 (프롬프트 튜닝)
```

**AI/ML 우려**:
- "Mock 응답은 다양성 제한적. 실제 꿈처럼 연쇄 패턴 부족"
- "프롬프트 엔지니어링 시간 3-4주 필요"

#### Frontend의 입장
```
현재: Mock fallback 구현 완료
가능:
- VITE_AI=edge 로 전환 즉시 가능
- 성능 영향: +200ms (네트워크) 예상
- 오류율: 429 rate limit만 주의 (fallback X)
```

**Frontend 우려**: "하드코딩 응답에서 실제 API로 전환 시 버그 가능성"

#### 🎯 **PM의 최종 판단**

**실행 전략: "3주 일정으로 분할 (점진적 전환)"**

```
Week 1 (3/6-3/13): Claude 기본 연동 + 기초 프롬프트
├─ Claude 계정 + API 키 (2시간)
├─ 기초 프롬프트 (Dream Analysis)
│  ├─ "경험이 풍부한 꿈 분석가" 페르소나
│  ├─ 1-5개 심볼 + 1-5개 감정 추출
│  ├─ JSON 구조화된 출력
│  └─ 의료 표현 금지 (면책 조항)
├─ Edge Function skeleton → 하드코딩 응답 제거
└─ 테스트: 샘플 꿈 100개 분석 (품질 평가)

Week 2 (3/13-3/20): 프롬프트 반복 개선 + Beta 롤아웃
├─ 사용자 피드백 수집 (첫 100명)
├─ 프롬프트 튜닝 (응답 다양성)
├─ 성능 모니터링 (API 비용 + 응답 시간)
└─ A/B 테스트 (Mock vs Claude)

Week 3 (3/20+): 지속적 개선 (Rolling basis)
├─ 월별 프롬프트 업데이트
├─ 사용자 만족도 추적 (NPS)
└─ 비용 최적화 (토큰 압축)
```

**사용자 경험 변화**:

| 항목 | Mock (현재) | Claude (3주 후) |
|------|-----------|----------------|
| **응답 다양성** | 패턴 매칭 (결정적) | 생성형 (창의성) |
| **정확도** | ~70% (기준) | ~85% (예상) |
| **응답 시간** | 100ms | 300ms (+200ms) |
| **비용** | 무료 | $10-30/월 |
| **사용자 만족도** | 중간 | 높음 (예상) |

**이유**:
1. **"3주 프롬프트 튜닝" 현실적**
   - 기초 프롬프트는 1-2일 (AI/ML이 작성)
   - 반복 개선는 사용자 피드백 필요 (Beta 그룹)
   - 완벽함보다 "충분함" 목표

2. **출시 전 실제 연동 필수**
   - Mock은 마케팅 거짓 (실제 AI가 아님)
   - "AI 기반 분석" 광고는 Claude 필요
   - Beta에서 품질 검증 후 일반 출시

3. **비용 합리적**
   - 월 1,000회 분석 × $0.01-0.05 = $10-50/월
   - 사용자당 $0.01-0.05 비용
   - 유료 구독 ($7.99/월)에서 충분히 회수 가능

#### 결정: **3주 점진적 전환 (기초 → 개선 → 최적화)**

---

### 문제 3️⃣: TypeScript 전환
> Frontend가 권장했으나 출시 일정(3-4주)과 충돌 가능. 출시 전 vs 출시 후?

#### Frontend의 입장
```
현재: JSDoc 타입 (부분적)
권고: TypeScript 도입
이유:
- 컴포넌트 props 미정의 (타입 안전성 부족)
- 스토어 간 의존성 추적 어려움
- 대규모 refactoring 시 버그 위험
```

**Frontend 우려**: "TypeScript 없이 나중에 유지보수 어려움"

#### Backend의 입장
```
현재: TypeScript 사용 중 (Supabase Edge Functions)
조언:
- TS는 "좋음"이지만 "필수"는 아님
- 점진적 도입 가능 (allowJs: true)
- 번들 크기 증가 (빌드 시간 +20%)
```

**Backend 주의**: "TypeScript 도입 시 빌드 시간 증가"

#### PM의 입장
```
출시: 3-4주
TypeScript 도입: 2-3주 (전체 코드 마이그레이션)
충돌 명확
```

#### 🎯 **PM의 최종 판단**

**실행 전략: "출시 후 점진적 도입 (허용 모드)"**

```
Phase 1 (출시, 2026-03-15):
├─ TypeScript 불필요
├─ JSDoc + Zod로 충분 (현재 상태 유지)
└─ 이유: 회귀 테스트 + 배포 리스크 높음

Phase 2 (출시 1개월 후, 2026-04-15):
├─ tsconfig.json: allowJs + checkJs (점진적)
├─ 핵심 파일부터 (.ts 전환)
│  ├─ adapters/* (핵심 인터페이스)
│  ├─ store/* (상태 관리)
│  └─ lib/ai/* (AI 로직)
├─ 빌드 파이프라인 준비
└─ 개발자 채용 시 TS 경험 우대

Phase 3 (6개월 목표):
└─ 전체 코드베이스 TypeScript 마이그레이션
```

**근거**:

1. **현재 타입 안전성은 충분**
   - JSDoc + Zod로 runtime 검증 가능
   - Zustand 스토어의 type inference 우수
   - 287개 테스트가 타입 버그 catch

2. **출시 속도가 최우선**
   - 3-4주 일정 고정
   - TypeScript 도입 = +2-3주
   - 손익분석: 출시 지연 > 나중 TypeScript

3. **점진적 도입 전략이 현실적**
   ```bash
   # 2026-04-15 이후
   tsconfig.json
   {
     "compilerOptions": {
       "allowJs": true,      // .js 파일도 컴파일
       "checkJs": true,      // JS 타입 검사
       "noImplicitAny": true // 암시적 any 금지
     }
   }

   # 우선 순위
   1️⃣ src/lib/adapters/* (.ts 전환)
   2️⃣ src/store/* (.ts 전환)
   3️⃣ src/lib/ai/* (.ts 전환)
   4️⃣ src/hooks/* (.ts 전환)
   5️⃣ src/components/* (.ts 전환)
   ```

#### 결정: **출시 후 점진적 도입 (allowJs 모드)**

---

### 문제 4️⃣: 기술 부채 vs 출시 속도
> Backend의 Rate Limit 인메모리 문제, Security의 Android 암호화 등 출시 전 필수 vs 후순위 분류

#### 식별된 기술 부채

| 항목 | 심각도 | 영향 | 출시 영향 |
|------|--------|------|----------|
| **Rate Limit (인메모리)** | 🔴 높음 | 콜드스타트 시 제한 리셋 | 프로덕션 불가 |
| **Android 암호화** | 🔴 높음 | 민감 데이터 평문 저장 | 보안 거부 가능 |
| **npm 취약점** | 🟡 중간 | 12개 패키지 의존성 | 보안 심사 실패 |
| **JWT 갱신** | 🟡 중간 | 토큰 만료 처리 미완 | 사용자 로그아웃 |
| **TypeScript** | 🟢 낮음 | 개발 속도 저하 | 출시 비블로킹 |

#### Backend의 입장: "Rate Limit은 막을 수 없다"
```
현재: Deno 콜드스타트 시 인메모리 Map 리셋
문제: 다중 인스턴스 환경에서 제한 무시
출시 전: Vercel KV 또는 Redis 필요
```

**Backend 주장**: "출시 전 반드시 해결"

#### Security의 입장: "Android 암호화 필수"
```
현재: SharedPreferences (평문)
권장: EncryptedSharedPreferences
출시 전: 앱 스토어 정책상 필수
```

**Security 주장**: "출시 전 반드시 해결"

#### 🎯 **PM의 최종 판단**

**실행 전략: "심각도 3단계 분류 + 병렬 해결"**

```
🔴 CRITICAL (출시 전 필수, 2주)
├─ 1️⃣ Rate Limit: Vercel KV로 마이그레이션 (3일)
│  ├─ Deno Edge Function → Vercel KV 저장소
│  ├─ 분산 환경 지원
│  └─ 테스트: 다중 인스턴스 제한 검증
│
└─ 2️⃣ Android 암호화 (3일)
   ├─ SharedPreferences → EncryptedSharedPreferences
   ├─ Capacitor.Preferences 래핑 강화
   └─ 테스트: 민감 데이터 암호화 검증

🟡 HIGH (출시 후 1개월, 2주)
├─ 1️⃣ npm 취약점 패치 (2일)
│  ├─ npm audit fix
│  ├─ 의존성 업그레이드
│  └─ CI/CD 자동화
│
└─ 2️⃣ JWT 갱신 로직 (3일)
   ├─ Supabase refreshSession() 자동화
   ├─ 만료 시 재인증
   └─ 테스트: 토큰 만료 시나리오

🟢 LOW (출시 후 3개월)
└─ TypeScript 마이그레이션 (2-4주)
```

**이유**:

1. **Rate Limit: 프로덕션 불가피 문제**
   - Deno 콜드스타트 = 상태 손실
   - 다중 사용자 → 제한 무시 = 불공정
   - 해결: Vercel KV ($0.2/GB, 충분함)

2. **Android 암호화: 규제 필수**
   - 앱 스토어 정책: 보안 요구사항
   - 사용자 신뢰: 암호화 표시 필수
   - 구현: EncryptedSharedPreferences (2시간)

3. **npm 취약점: 보안 심사 이슈**
   - 심각도 낮음 (12개 모두 간접 의존성)
   - 출시 후 패치 가능
   - Priority: 첫 운영 주간

4. **JWT 갱신: 사용자 경험 이슈**
   - 현재: 토큰 무제한 (로컬 모드)
   - Phase 2: Supabase JWT (1시간 만료)
   - Priority: Supabase 연동 후 (3월)

#### 결정: **3단계 우선순위 분류 + 병렬 해결**

---

## Group A의 3가지 최종 권고사항

### 📌 Recommendation 1: Supabase 스키마 우선 (2월 27일까지)

**액션 항목**:
- Backend: 5개 테이블 정의 + RLS 정책 (데이터 마이그레이션 전략 포함)
- Frontend: 어댑터 준비 (대기)
- PM: Supabase 프로덕션 환경 사전 설정 (DevOps와 협력)

**의존성**:
- ✅ Frontend의 Adapter 패턴 (이미 준비)
- ✅ Backend의 API 설계 (이미 완성)
- ⏳ Supabase 프로덕션 환경 (DevOps 필요)

**성공 지표**:
- [ ] 테이블 생성 완료 (DDL 스크립트)
- [ ] RLS 정책 검토 완료 (Security 팀)
- [ ] 샘플 데이터 마이그레이션 테스트 (1명 사용자)

---

### 📌 Recommendation 2: Claude AI 3주 점진적 연동

**액션 항목**:
- AI/ML: 기초 프롬프트 + Edge Function 실제 구현
- Frontend: VITE_AI=edge 전환 준비 + Mock fallback 강화
- PM: Claude 계정 + API 키 관리

**일정**:
- Week 1 (3/6): Claude API + 기초 프롬프트
- Week 2 (3/13): 프롬프트 개선 + Beta 롤아웃
- Week 3 (3/20): 지속적 모니터링

**성공 지표**:
- [ ] Claude 응답 품질 >= 80%
- [ ] API 응답 시간 <= 500ms (p99)
- [ ] 비용 <= $30/월 (예상)
- [ ] 사용자 만족도 >= 4/5 (Beta)

---

### 📌 Recommendation 3: CRITICAL 기술 부채 2주 해결 (병렬)

**액션 항목**:

**Team A (Backend + DevOps)**:
- Rate Limit: 인메모리 → Vercel KV 마이그레이션 (3일)
  - Deno Edge Function 수정
  - 다중 인스턴스 테스트
  - 비용: $0.2/GB (무시할 수준)

**Team B (Frontend + Security)**:
- Android 암호화: SharedPreferences → EncryptedSharedPreferences (3일)
  - Capacitor.Preferences 래핑 강화
  - 테스트: 민감 데이터 확인

**일정**:
- 병렬: 2월 24일 - 3월 6일 (2주)
- 목표: 출시 전 완료

**성공 지표**:
- [ ] Rate Limit: 다중 인스턴스 환경에서 제한 적용 확인
- [ ] Android 암호화: EncryptedSharedPreferences 적용 확인
- [ ] Security 심사: "출시 가능" 판정

---

## Group A의 최종 메시지

### 💡 핵심 통찰

1. **Adapter 패턴이 탁월한 선택**
   - Frontend가 준비되어 있음 (VITE_BACKEND, VITE_AI 환경변수만)
   - Backend는 구현 시간에만 집중 가능
   - 병렬 진행으로 3월 중순 출시 달성 가능

2. **기술 부채는 심각도별 분류 필수**
   - CRITICAL (출시 전): Rate Limit, Android 암호화
   - HIGH (출시 후 1개월): npm 취약점, JWT 갱신
   - LOW (출시 후 3개월): TypeScript

3. **AI 실제 연동은 점진적**
   - Mock → Claude는 3주면 충분
   - Beta에서 품질 검증 후 일반 출시
   - 비용 합리적 ($10-30/월)

### 🎯 다음 단계

**이번 주 (2월 24일)**:
- [ ] Backend: Supabase 테이블 설계 시작
- [ ] DevOps: Supabase 프로덕션 환경 설정
- [ ] PM: Claude API 계정 생성

**다음 주 (3월 3일)**:
- [ ] Backend: 스키마 + RLS 완료 + API 구현 시작
- [ ] Frontend: Adapter 전환 테스트 시작
- [ ] AI/ML: 기초 프롬프트 완성

**3월 10일**:
- [ ] Beta 출시 (로컬 Supabase 또는 Staging)
- [ ] 초기 사용자 50명 모집
- [ ] 품질 피드백 수집

**3월 15일**:
- [ ] 프로덕션 출시 (v1.0.0)
- [ ] Claude AI 베타 적용
- [ ] 마케팅 시작

---

## 부록: 팀 간 의존성 체크

```
┌─────────────────────────────────────────────┐
│ Frontend (준비 완료) ←→ Backend (진행 중)   │
│                                             │
│ Adapter 준비: ✅                           │
│ - VITE_BACKEND 전환 준비                   │
│ - VITE_AI 전환 준비                        │
│ - Mock fallback 강화                       │
│                                             │
│ 대기 중:                                     │
│ - Supabase API 스펙 (Backend 제공)        │
│ - Claude API 응답 형식 (AI/ML 제공)      │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Backend → DevOps (병렬 필요)                │
│                                             │
│ 필요한 것:                                   │
│ - Vercel KV 설정 (Rate Limit용)           │
│ - Edge Function 배포 파이프라인            │
│ - Supabase 프로덕션 환경                   │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ AI/ML → Frontend (3주 점진적)              │
│                                             │
│ Week 1: 기초 프롬프트 제공                  │
│ Week 2: 개선된 프롬프트                     │
│ Week 3: 지속적 튜닝                        │
│                                             │
└─────────────────────────────────────────────┘
```

---

**작성**: Group A (PM, Frontend, Backend, AI/ML)
**최종 검토**: Team Lead 대기
