#!/usr/bin/env bash
# Патч paths в backend tsconfig для резолва @daibilet/shared в Docker (одноразовый).
set -e
F="/opt/daibilet/packages/backend/tsconfig.json"
if [ ! -f "$F" ]; then echo "File not found: $F"; exit 1; fi
# Добавить @daibilet/shared в paths, если ещё нет
if grep -q '"@daibilet/shared"' "$F"; then echo "Already patched"; exit 0; fi
sed -i 's|"@/\*": \["src/\*"\]|"@/\*": ["src/*"],\n      "@daibilet/shared": ["../shared"],\n      "@daibilet/shared/*": ["../shared/*"]|' "$F"
echo "Patched $F"
