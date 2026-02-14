#!/usr/bin/env bash
# ==========================================================
# Tech Debt Audit Script
# Подсчитывает метрики технического долга и сравнивает с бюджетом.
# Запуск: bash scripts/tech-debt-audit.sh
# CI:     bash scripts/tech-debt-audit.sh --ci
# ==========================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Бюджеты (максимально допустимые значения)
# Уменьшай каждую неделю: -10 any, -5 as_any
BUDGET_AS_ANY=30
BUDGET_ANY_ANNOTATIONS=150
BUDGET_EMPTY_CATCH=5
BUDGET_ESLINT_WARNINGS=0

echo "========================================"
echo "  Tech Debt Audit — $(date +%Y-%m-%d)"
echo "========================================"
echo ""

# 1. as any (без тестов и сидов)
AS_ANY=$(grep -r "as any" --include="*.ts" --include="*.tsx" \
  packages/backend/src packages/frontend/src packages/shared/src \
  packages/frontend-admin/src packages/frontend-supplier/src \
  2>/dev/null | grep -v "__tests__" | grep -v ".spec." | wc -l | tr -d ' ')

echo -e "as any casts:       ${AS_ANY} / ${BUDGET_AS_ANY}"

# 2. : any annotations (без тестов)
ANY_ANNOTATIONS=$(grep -rE ": any[;\),\]\s\|]" --include="*.ts" --include="*.tsx" \
  packages/backend/src packages/frontend/src packages/shared/src \
  packages/frontend-admin/src packages/frontend-supplier/src \
  2>/dev/null | grep -v "__tests__" | grep -v ".spec." | wc -l | tr -d ' ')

echo -e "any annotations:    ${ANY_ANNOTATIONS} / ${BUDGET_ANY_ANNOTATIONS}"

# 3. empty catches: .catch(() => {}) or .catch(() => { })
EMPTY_CATCH=$(grep -rE "\.catch\(\(\)\s*=>\s*\{\s*\}" --include="*.ts" --include="*.tsx" \
  packages/ 2>/dev/null | wc -l | tr -d ' ')

echo -e "empty catches:      ${EMPTY_CATCH} / ${BUDGET_EMPTY_CATCH}"

# 4. @Body() : any (write endpoints without DTO)
BODY_ANY=$(grep -rE "@Body\(\)\s+\w+:\s*any" --include="*.ts" \
  packages/backend/src 2>/dev/null | wc -l | tr -d ' ')

echo -e "@Body() : any:      ${BODY_ANY} / 0"

echo ""
echo "========================================"

# CI mode: проверяем бюджеты
FAILED=0

if [ "${1:-}" = "--ci" ]; then
  echo ""
  echo "Checking budgets..."

  if [ "$BODY_ANY" -gt 0 ]; then
    echo -e "${RED}FAIL${NC}: @Body() : any found ($BODY_ANY). All write endpoints must use typed DTOs."
    FAILED=1
  else
    echo -e "${GREEN}PASS${NC}: No @Body() : any"
  fi

  if [ "$AS_ANY" -gt "$BUDGET_AS_ANY" ]; then
    echo -e "${RED}FAIL${NC}: as any ($AS_ANY) exceeds budget ($BUDGET_AS_ANY)"
    FAILED=1
  else
    echo -e "${GREEN}PASS${NC}: as any within budget"
  fi

  if [ "$EMPTY_CATCH" -gt "$BUDGET_EMPTY_CATCH" ]; then
    echo -e "${RED}FAIL${NC}: empty catches ($EMPTY_CATCH) exceeds budget ($BUDGET_EMPTY_CATCH)"
    FAILED=1
  else
    echo -e "${GREEN}PASS${NC}: empty catches within budget"
  fi

  echo ""

  if [ "$FAILED" -eq 1 ]; then
    echo -e "${RED}Tech debt audit FAILED.${NC} Fix violations before merging."
    exit 1
  else
    echo -e "${GREEN}Tech debt audit PASSED.${NC}"
    exit 0
  fi
fi
