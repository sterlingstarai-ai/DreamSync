# Hardening Effort Model

> DreamSync Release Hardening — 작업량 산정 모델 (2026-02-04)

## 베이스라인 측정값

| 지표 | 값 | 목표 |
|------|-----|------|
| Mutation survivors | 0/17 | 0 ✅ |
| Fuzz 크래시 | 0 (1건 수정 완료) | 0 ✅ |
| E2E flake rate | 0% (3x repeat) | 0% ✅ |
| Feature flag off 위반 | 0 | 0 ✅ |
| PII 누출 패턴 | 0 (수동 스캔) | 0 ✅ |
| 번들 시크릿 | 0 hits | 0 ✅ |

## 잔여 작업 분석

### 결함 0 달성 완료 항목

| 영역 | 상태 | 근거 |
|------|------|------|
| Mutation kill rate | 100% | 17/17 killed |
| Fuzz crash | 0 | NaN date 수정 후 0 |
| 범위 불변 위반 | 0 | fast-check 1,400+ runs |
| Flag off 경로 침범 | 0 | 6개 플래그 기본값 테스트 |
| PII 로그 누출 | 0 | maskDreamContent + maskSensitiveFields |

### 추가 강화 필요 항목

| 영역 | 현재 | 작업 단위 | 우선순위 |
|------|------|-----------|---------|
| Flag-off smoke test (자동) | 기본값 테스트만 | 1 테스트 추가 (컴포넌트 import 경로 검증) | P1 |
| PII leak regression test | 수동 스캔만 | 1 테스트 추가 (빌드 출력 스캔) | P1 |
| 20x+ repeat 실행 | 3x만 실행 | release-gate.sh 실행 1회 | P1 |
| Playwright E2E | 미설치 | Phase 2 별도 작업 | P3 |
| 네이티브 E2E | 미구성 | Phase 3 별도 작업 | P4 |

## 작업 단위 모델

```
버그 1건 = 원인 분석 + 최소 수정 + 회귀 테스트 1개 + verify 1회

현재 잔여:
- P1 테스트 추가: 2건 (flag-off smoke, PII regression)
- P1 검증 실행: 1건 (20x repeat)
- 문서: 3건 (device matrix, test template, progress log)
```

## 결론

**핵심 결함: 0. 잔여 작업은 방어선 강화(테스트 추가 + 문서).**

mutation survivors 0, fuzz crash 0, flake rate 0%이므로
"오류 원천 차단" 기준의 코어 로직은 달성.
추가 작업은 자동화된 방어선을 넓히는 것 (flag-off smoke, PII scan 자동화, repeat 횟수 증가).
