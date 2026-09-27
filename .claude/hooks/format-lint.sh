#!/usr/bin/env bash
# PostToolUse hook on Edit|Write|MultiEdit: prettier + eslint --fix on the edited file.
# Exit 2 reports remaining lint errors back to Claude Code.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

if [ ! -d node_modules ]; then
  echo "format-lint: node_modules/ absent, skipped (available after ZMT-A-2)."
  exit 0
fi

if [ -t 0 ]; then INPUT='{}'; else INPUT=$(cat); fi
FILE=$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s||"{}").tool_input?.file_path??"")}catch{}})')
[ -n "$FILE" ] && [ -f "$FILE" ] || exit 0

case "$FILE" in
  *.ts|*.mts|*.cts|*.js|*.mjs|*.cjs|*.html|*.scss|*.css|*.json|*.md|*.yml|*.yaml) ;;
  *) exit 0 ;;
esac

npx prettier --write --log-level warn "$FILE" >/dev/null 2>&1 || true

case "$FILE" in
  *.ts|*.mts|*.cts|*.js|*.mjs|*.cjs|*.html)
    if ! OUT=$(npx eslint --fix "$FILE" 2>&1); then
      printf '%s\n' "$OUT" >&2
      exit 2
    fi
    ;;
esac
exit 0
