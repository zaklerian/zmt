#!/usr/bin/env bash
# Enforces R-PROJ-1 branch naming at two points:
#   1. Branch CREATION (checkout -b / switch -c / git branch <name>) — rejects a
#      non-conforming new branch name.
#   2. COMMIT / PUSH on the CURRENT branch — rejects when HEAD is not a
#      dev/ZMT-* or hotfix/ZMT-* branch. This closes the gap where the harness
#      pre-creates a `claude/<slug>` branch: creation never fires (the branch
#      already exists), so without this check, commits/pushes on it slip through.
# R-PROJ-1 wins over the harness branch default; the per-task prompt authorizes
# the dev/ZMT-N branch (see CLAUDE.md session contract). CC must create and switch
# to dev/ZMT-{id} before committing.
set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

CONFORMING='^(dev|hotfix)/ZMT-'

reject() {
  printf '{"block":true,"message":%s}' "$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$1")"
  exit 0
}

# --- 1. Branch creation forms ---
for pattern in 'git checkout -b ' 'git switch -c ' 'git branch +[^-]'; do
  if echo "$CMD" | grep -qE "$pattern"; then
    case "$pattern" in
      *'checkout -b'*) BRANCH=$(echo "$CMD" | sed -E 's/.*git checkout -b ([^ ]+).*/\1/' | head -n1) ;;
      *'switch -c'*)   BRANCH=$(echo "$CMD" | sed -E 's/.*git switch -c ([^ ]+).*/\1/' | head -n1) ;;
      *)               BRANCH=$(echo "$CMD" | sed -E 's/.*git branch +([^ ]+).*/\1/' | head -n1) ;;
    esac
    if ! echo "$BRANCH" | grep -qE "$CONFORMING"; then
      reject "Branch name \"$BRANCH\" violates R-PROJ-1. Must match dev/ZMT-X or hotfix/ZMT-X. Rename and retry."
    fi
  fi
done

# --- 2. Commit / push on the current branch ---
if echo "$CMD" | grep -qE 'git (commit|push)\b'; then
  CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ -n "$CURRENT" ] && ! echo "$CURRENT" | grep -qE "$CONFORMING"; then
    reject "Current branch \"$CURRENT\" violates R-PROJ-1 (commit/push blocked). The harness pre-created branch does not conform. Create and switch to dev/ZMT-{id} first: git checkout -b dev/ZMT-{id}. R-PROJ-1 wins over the harness branch default; the per-task prompt authorizes this."
  fi
fi
