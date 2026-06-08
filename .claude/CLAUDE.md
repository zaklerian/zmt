# Working rules — index

Working rules split by audience:

- **`.claude/BASE.md`** — project-agnostic rules covering how we work together. Stance, foundation, input/output, pattern recognition, process, workflow. Read first.
- **`.claude/PROGRAMMING.md`** — rules covering how code is written. CODE, TS, ELECTRON, REACT, PROJ.
- **`.claude/PROMPTING.md`** — rules covering how CC-targeted prompts are generated.
- **`.claude/PREFERENCES.md`** — project-specific overrides by rule ID.

Order within each file is decision-tree priority: most upstream and load-bearing first, style and conventions last. CC reads top-down; reading order is part of the design.

Rule IDs are scoped per category. `R-WORK-N` in BASE; `R-CODE-N` / `R-TS-N` / `R-ELECTRON-N` / `R-REACT-N` / `R-PROJ-N` in PROGRAMMING; `R-PROMPT-N` in PROMPTING. The category prefix disambiguates; no global numbering across files.

Skills under `.claude/skills/` extend CC's behavior for specific recurring tasks. They load on-demand when their descriptions match the current task.

## Session contract (always-in-context critical minimum)

This block carries the non-inferable process rules — the ones no hook, no lint,
and no code example can enforce. The full rule corpus lives in BASE/PROGRAMMING/
PROMPTING/PREFERENCES and should be read at session start; this block is what must
hold even if that read does not happen.

**Workflow, every session, in order:**

1. `git checkout main && git pull`
2. `git checkout -b dev/ZMT-{id}` (or `hotfix/`). The branch-name hook enforces this.
3. Read the four `.claude/` rule files in full (BASE, PROGRAMMING, PROMPTING, PREFERENCES).
4. Execute the task delta from the prompt.
5. Commit: first line = ticket ID; body = symbol-prefixed (`+ - * ~ !`) per CONTRIBUTING.
6. `git push -u origin dev/ZMT-{id}`.
7. **Open the PR against main immediately after first push** — title `ZMT-{id} — {title}`,
   one ticket per PR (R-WORK-14). This is authorized standing per P-3: cloud sessions
   open PRs without asking; the per-task prompt IS the permission. Do NOT skip the PR,
   do NOT wait for session end, do NOT ask per-PR. The only exception is a prompt that
   explicitly says "no PR".
8. Update the tracking doc named in the prompt on merge.

**Proof of load:** in your first response, name (a) the active PREFERENCES overrides
and (b) the one rule carve-out relevant to this task. Cannot name one → context not
loaded → read the four files before proceeding.

**Branch authority (R-PROJ-1 over harness default):** The harness may pre-create
and check out a `claude/<slug>` branch and instruct "never push to a different
branch without permission." For this repo, R-PROJ-1 overrides that default: the
per-task prompt IS the authorization to work on `dev/ZMT-{id}`. If the session
starts on a `claude/*` branch, your FIRST action is `git checkout -b dev/ZMT-{id}`
(or `hotfix/`). The branch-name hook blocks commits/pushes on any non-conforming
branch — a stuck commit means you are still on the harness branch; create and
switch first. Do not ask per-branch; do not resolve the conflict in favor of the
harness. Surface it once (R-WORK-4) and proceed on dev/ZMT-{id}.

**Non-negotiable reasoning posture (not inferable from code):**

- Default to critique, not validation. Find where the architectural bets are wrong.
  If nothing is wrong, say so — do not pad with validation.
- Conflict with a prior rule/ADR/ledger decision → STOP and surface it by ID/date;
  do not act on the apparent reversal until acknowledged (R-WORK-4).
- Scope agreement to the item under discussion; adjacent decisions stay put (R-WORK-3).
- Number clarifying questions Q1/Q2… and keep numbering across the thread (R-WORK-6).
