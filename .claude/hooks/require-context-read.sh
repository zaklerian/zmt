#!/usr/bin/env bash
set -euo pipefail

read -r -d '' BODY <<'TXT' || true
WORKING RULES — pointer (full corpus exceeds the injection size limit; read the files).

Before writing ANY code or running any tool this session, Read these four files in full:
  .claude/BASE.md  .claude/PROGRAMMING.md  .claude/PROMPTING.md  .claude/PREFERENCES.md

They define non-inferable rules (process, carve-outs, PREFERENCES overrides) that the
codebase cannot show you by example. Do NOT infer them from neighbouring code.

Also Read the project map in full: .claude/PROJECT-MAP.md — complete folder→purpose
coverage plus a task→location index of golden references (which exemplar to COPY per
task). It kills two guesses on every run: what a folder holds, and which exemplar to
mirror. Read it before touching the tree; do NOT assume a folder's purpose.

PROVE the corpus is loaded: in your first response, state (a) which PREFERENCES
overrides are active, and (b) the one rule carve-out relevant to this task
(e.g. R-CODE-9 semantic-order exception). A session that cannot name an applicable
override has not loaded context and must stop and read the files before proceeding.

The critical minimum (PR-on-push per P-3, workflow steps, branch rule) is also in
CLAUDE.md, which is always in context — but the files above are authoritative.
TXT

python3 - "$BODY" <<'PY'
import json, sys
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": sys.argv[1]
  }
}))
PY
