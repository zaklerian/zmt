#!/usr/bin/env bash
# Stop hook (PROC-4): governance checks, then nx affected lint/typecheck/test.
# Exit 2 keeps Claude Code working and feeds stderr back; exit 0 lets it stop.
set -uo pipefail

if [ -t 0 ]; then INPUT='{}'; else INPUT=$(cat); fi
ACTIVE=$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s||"{}").stop_hook_active===true))}catch{process.stdout.write("false")}})' 2>/dev/null || echo false)
if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

if ! bash .claude/hooks/governance.sh; then
  echo "verify: governance checks failed; fix the lines above before finishing." >&2
  exit 2
fi

if [ ! -d node_modules ]; then
  echo "verify: governance checks passed; node_modules/ absent, nx checks skipped (run pnpm install --frozen-lockfile)."
  exit 0
fi

if ! OUT=$(pnpm exec nx affected -t lint typecheck test 2>&1); then
  printf '%s\n' "$OUT" | tail -n 60 >&2
  echo "verify: nx affected -t lint typecheck test failed." >&2
  exit 2
fi
echo "verify: governance and nx affected lint/typecheck/test passed."
exit 0
