#!/bin/bash
# DreamSync Release Gate
# 모든 릴리즈 게이트를 순차적으로 실행하고 결과를 리포트
# 사용법: bash scripts/release-gate.sh [--repeat N]

set -euo pipefail

REPEAT=${1:-20}
if [[ "${1:-}" == "--repeat" ]]; then
  REPEAT=${2:-20}
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
RESULTS=()

report() {
  local status=$1
  local name=$2
  local detail=${3:-""}
  if [[ "$status" == "PASS" ]]; then
    PASS=$((PASS + 1))
    RESULTS+=("${GREEN}✅ PASS${NC} $name $detail")
  else
    FAIL=$((FAIL + 1))
    RESULTS+=("${RED}❌ FAIL${NC} $name $detail")
  fi
}

echo "═══════════════════════════════════════════════"
echo "  DreamSync Release Gate"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════"
echo ""

# ── Gate 1: npm run verify (lint + typecheck + build + test) ──
echo "▶ Gate 1: npm run verify"
if npm run verify > /dev/null 2>&1; then
  report "PASS" "npm run verify"
else
  report "FAIL" "npm run verify"
  echo "  ${RED}npm run verify 실패 — 후속 게이트 스킵${NC}"
  # 결과 출력 후 종료
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "  결과: PASS=$PASS FAIL=$FAIL"
  echo "═══════════════════════════════════════════════"
  for r in "${RESULTS[@]}"; do echo -e "  $r"; done
  exit 1
fi

# ── Gate 2: 번들 시크릿 스캔 ──
echo "▶ Gate 2: 번들 시크릿 스캔"
SECRET_HITS=$(grep -rE 'sk-ant|ANTHROPIC_API_KEY|password\s*=' dist/ 2>/dev/null | wc -l | tr -d ' ')
if [[ "$SECRET_HITS" -eq 0 ]]; then
  report "PASS" "번들 시크릿 스캔" "(0 hits)"
else
  report "FAIL" "번들 시크릿 스캔" "($SECRET_HITS hits)"
fi

# ── Gate 3: PII 스캔 (소스코드에서 dream/health raw 외부 전송 패턴) ──
echo "▶ Gate 3: PII 스캔"
# 로그/분석에 dream 원문이 직접 전달되는 패턴 탐지
# 허용: maskDreamContent, maskSensitiveFields, [chars], [items]
PII_PATTERNS='(console\.(log|warn|error|info)\s*\(\s*[^)]*\b(dreamContent|dream\.content|\.content\b)[^)]*\))'
PII_HITS=$(grep -rE "$PII_PATTERNS" src/ --include='*.js' --include='*.jsx' \
  | grep -v 'mask' | grep -v 'test' | grep -v '__tests__' | grep -v '.test.' \
  | grep -v 'schemas' | grep -v '// ' | wc -l | tr -d ' ')

# 분석 이벤트에 raw health data 전달 패턴
HEALTH_PII=$(grep -rE '(track|log|send|emit)\s*\([^)]*\b(hrvMs|remMinutes|deepMinutes|sleepData|healthData)\b' src/ \
  --include='*.js' --include='*.jsx' \
  | grep -v 'test' | grep -v '__tests__' | grep -v '.test.' \
  | grep -v 'mock' | grep -v '// ' | wc -l | tr -d ' ')

TOTAL_PII=$((PII_HITS + HEALTH_PII))
if [[ "$TOTAL_PII" -eq 0 ]]; then
  report "PASS" "PII 스캔" "(dream/health raw 외부 전송 0)"
else
  report "FAIL" "PII 스캔" "($TOTAL_PII 잠재 누출)"
fi

# ── Gate 4: Feature flag 기본값 검증 ──
echo "▶ Gate 4: Feature flag 기본값"
FLAG_TRUE=$(grep -E '^\s*(healthkit|saju|uhs|b2b|edgeAI|devMode)\s*:\s*true' src/constants/featureFlags.js | wc -l | tr -d ' ')
if [[ "$FLAG_TRUE" -eq 0 ]]; then
  report "PASS" "Feature flag 기본값" "(all false)"
else
  report "FAIL" "Feature flag 기본값" "($FLAG_TRUE flags default=true)"
fi

# ── Gate 5: 반복 실행 (flaky 검출) ──
echo "▶ Gate 5: 반복 실행 (${REPEAT}회)"
FLAKE_COUNT=0
for i in $(seq 1 $REPEAT); do
  if ! npx vitest run --retry 0 > /dev/null 2>&1; then
    FLAKE_COUNT=$((FLAKE_COUNT + 1))
    echo "  ${RED}Run $i: FAIL${NC}"
  fi
done

if [[ "$FLAKE_COUNT" -eq 0 ]]; then
  report "PASS" "반복 실행" "(${REPEAT}x 0 failures)"
else
  report "FAIL" "반복 실행" "(${REPEAT}x ${FLAKE_COUNT} failures)"
fi

# ── 결과 요약 ──
echo ""
echo "═══════════════════════════════════════════════"
echo "  Release Gate 결과"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo -e "  $r"; done
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}🎉 모든 게이트 통과 — 릴리즈 가능${NC}"
  exit 0
else
  echo -e "${RED}⛔ ${FAIL}개 게이트 실패 — 릴리즈 차단${NC}"
  exit 1
fi
