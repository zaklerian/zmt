#!/usr/bin/env bash
# PreToolUse hook on Edit|Write|MultiEdit (PROC-1): block file edits inside the
# repo unless the current branch is dev/ZMT-A-<N> or hotfix/ZMT-A-<N>.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

if [ -t 0 ]; then INPUT='{}'; else INPUT=$(cat); fi
FILE=$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s||"{}").tool_input?.file_path??"")}catch{}})' 2>/dev/null || true)
if [ -n "$FILE" ]; then
  ABS=$(realpath -m "$FILE")
  case "$ABS" in
    "$(realpath -m "$ROOT")"/*) ;;
    *) exit 0 ;;
  esac
fi

BRANCH=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo "(detached)")
if ! grep -qE '^(dev|hotfix)/ZMT-A-(D[0-9]+[a-z]?|[0-9]+(\.[0-9]+)?)$' <<<"$BRANCH"; then
  echo "check-branch: edits are blocked on '$BRANCH' (PROC-1). Create the task branch first: git checkout -b dev/ZMT-A-<N>" >&2
  exit 2
fi
exit 0
