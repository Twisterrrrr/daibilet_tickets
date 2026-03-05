#!/usr/bin/env sh
set -eu

if rg -n "data-event-id=\{[^}]*event\.id" packages/frontend/src >/dev/null; then
  echo "Do not use raw event.id in data-event-id; use getPartnerEventId(event)" >&2
  rg -n "data-event-id=\{[^}]*event\.id" packages/frontend/src >&2 || true
  exit 1
fi

