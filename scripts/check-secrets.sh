#!/bin/bash
# 시크릿/API 키 커밋 방지 스크립트
# pre-commit hook 또는 CI에서 실행
#
# 사용법:
#   scripts/check-secrets.sh          # staged 파일만 검사
#   scripts/check-secrets.sh --all    # 전체 레포 검사

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# 검사 대상 패턴
PATTERNS=(
  'sk-ant-'
  'ANTHROPIC_API_KEY\s*='
  'VITE_SUPABASE_ANON_KEY\s*=\s*ey'
  'VITE_SENTRY_DSN\s*=\s*https'
  'VITE_MIXPANEL_TOKEN\s*=\s*[a-f0-9]'
  'VITE_REVENUECAT_KEY'
  'password\s*=\s*["\x27][^"\x27]'
)

# 무시할 파일
IGNORE_FILES=(
  '.env.example'
  'scripts/check-secrets.sh'
  'CLAUDE.md'
  '*.test.js'
  '*.test.ts'
)

FOUND=0

# 무시 패턴 생성
IGNORE_ARGS=""
for f in "${IGNORE_FILES[@]}"; do
  IGNORE_ARGS="$IGNORE_ARGS --exclude=$f"
done

if [ "$1" = "--all" ]; then
  FILES=$(git ls-files)
else
  FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || echo "")
fi

if [ -z "$FILES" ]; then
  echo -e "${GREEN}No files to check.${NC}"
  exit 0
fi

for pattern in "${PATTERNS[@]}"; do
  MATCHES=$(echo "$FILES" | xargs grep -lnE "$pattern" $IGNORE_ARGS 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo -e "${RED}[SECRET DETECTED] Pattern: $pattern${NC}"
    echo "$MATCHES"
    FOUND=1
  fi
done

# .env 파일 자체 커밋 방지 (.env.example은 허용)
ENV_FILES=$(echo "$FILES" | grep -E '^\.(env|env\.local|env\.production)$' 2>/dev/null || true)
if [ -n "$ENV_FILES" ]; then
  echo -e "${RED}[BLOCKED] .env file should not be committed:${NC}"
  echo "$ENV_FILES"
  FOUND=1
fi

if [ $FOUND -eq 1 ]; then
  echo ""
  echo -e "${RED}Commit blocked: secrets or .env files detected.${NC}"
  echo "Use .env.example for templates, never commit actual secrets."
  exit 1
fi

echo -e "${GREEN}No secrets found.${NC}"
exit 0
