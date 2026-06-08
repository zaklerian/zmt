# Working rules — base

Project-agnostic rules covering how we work together. Read this file first. PROGRAMMING.md covers code. PROMPTING.md covers CC-targeted prompts. PREFERENCES.md overrides any item by ID.

Order in this file is decision-tree priority. Foundation rules prime everything else and come first; concrete workflow steps come last. CC reads top-down.

## Stance

This codebase makes deliberate architectural bets. Your job is to find where bets are wrong, not validate them. Default to critique. If you find nothing wrong, say so directly — do not pad with validation. Audience operates at staff/principal level; match that depth without performative credentialing. If you need more context to critique fairly, ask before assuming.

## Conventions

- `R-WORK-{N}` — invariant rule. Breaking it requires explicit override in PREFERENCES.
- `A-WORK-{N}` — default approach when multiple options exist. Override-able.
- Numbers scoped to this file; no overlap with `R-CODE` / `R-PROMPT` / other categories.

---

## Foundation

These rules prime how every other rule in every other file is interpreted and written.

**R-WORK-1.** Rules are written as generation directives. A directive changes the default at write/generation time ("default to X", "treat input as Y", "interpret agreement as Z"). A filter strips after the fact ("remove X", "avoid Y", "do not include Z"). Directives prevent unwanted output; filters generate it then discard it. Prefer directive phrasing when drafting or amending a rule. Filter phrasing is acceptable only when enforcement lives at a different layer (lint, type system, runtime) rather than at generation.

**R-WORK-2.** Trigger text matches actual content. Skill descriptions match skill bodies; rule headers match rule bodies; documentation that drives generation behavior matches what it describes. When content changes, the trigger text changes in the same edit. Drift between trigger language and actual content invalidates the trigger.

## Reading input

**R-WORK-3.** Interpret agreement as scoped to the immediate item under discussion. Adjacent decisions remain at their current state until addressed explicitly.

**R-WORK-4.** When a new instruction conflicts with a project rule, ADR, or ledger decision, stop and surface the conflict. Name the prior decision's date or rule ID. Do not act on the apparent reversal until explicit user acknowledgment resolves the conflict. Applies to all rules including R-PROJ-1 (branch naming). The PreToolUse hook in `.claude/settings.json` blocks the most common case (branches); R-WORK-4 covers everything the hook doesn't.

## Output

**R-WORK-5.** Treat the reader as holding the relevant context. Generate output starting at the new information.

**R-WORK-6.** Multiple clarifying questions are numbered (`Q1`, `Q2`, ...) so the user can answer compactly (e.g., `Q1: A, Q2: B`). Numbering is maintained across the whole chat thread; once numbered Q&A starts, it does not drop mid-thread. Applies to every chat — planning, retros, design, code review, ad-hoc questions.

## Pattern recognition

**R-WORK-7.** Three exhibits of a pattern trigger extraction. For code — a component, hook, or service consumed three times → extract to a shared library per A-PROJ-1. For a conceptual pattern repeated in three implementations → document as a working principle in `docs/CONTRIBUTING.md` or an ADR. For a recurring discipline observation → codify as a rule. Defect-avoidance and process rules are the exception: they codify on first occurrence when the cost of recurrence is high.

**R-WORK-8.** Decisions in flight carry closure triggers. Items marked "In discussion", "revisit on retro", or "deferred" name the condition that returns them to active discussion. Decisions without return triggers default to Rejected on the next retro. Flip-flopping requires explicit re-decision, not silent drift.

## Process

**R-WORK-9.** Planning happens in chat; execution happens via CC sessions per task.

**R-WORK-10.** Successful task completion updates the relevant tracking file, not chat. Chat fires for planning, course correction, deviation review, or retros. Mechanical "task moved to Done" tracking lives in files.

**R-WORK-11.** Per-task CC prompts contain only the task-specific delta. Standing rules live in this file, PROGRAMMING.md, and PROMPTING.md.

**R-WORK-12.** Per-task CC prompts describe intent for implementation work and exact content for documentation work. Implementation prompts specify goal, files to touch, shape requirements, behavior requirements, applicable rules, constraints, and verification — never the code itself. Documentation prompts paste content verbatim when the prose IS the deliverable.

**R-WORK-13.** Retros examine: (a) whether the process helped, and (b) which decisions and rules diverged materially from estimated cost. Items flagged feed the next planning chat. If three consecutive retros report process-no-help, the process changes.

**R-WORK-14.** One ticket maps to exactly one PR. Prep work discovered during planning becomes a subtask `ZMT-X.Y` that ships before the parent's implementation; each subtask is its own ticket and its own PR.

## Approaches

**A-WORK-1.** When proposing changes that touch multiple files, list affected files first, then produce diffs.

**A-WORK-2.** When pushing back on a request, give the reasoning before the alternative.

---

## Workflow expectations for CC sessions

Every CC session executes these steps in order. Steps 1–3 precede reading any task-specific instruction.

1. **Sync main.** `git checkout main && git pull`.
2. **Create the task branch.** `git checkout -b dev/ZMT-{task-id}` (or `hotfix/ZMT-{task-id}`). Never accept CC's default `claude/<slug>-<hash>` branch name. R-PROJ-1 is enforced here, at session init, before any code change. The PreToolUse hook in `.claude/settings.json` rejects violating branch names automatically; if it fires, fix the branch name and retry — do not bypass.
3. **Context is read, not injected wholesale.** The SessionStart hook in `.claude/settings.json` injects a _pointer_, not the corpus — the full rule set exceeds the injection size limit. Before writing any code or running any tool, CC reads BASE.md, PROGRAMMING.md, PROMPTING.md, and PREFERENCES.md in full. In its first response of the session, CC states which PREFERENCES overrides are active and any rule carve-out relevant to the task (e.g. R-CODE-9 semantic-order exception), proving the corpus is loaded. A session that cannot name an applicable override has not loaded context and must stop and read the four files.
4. **Execute the task delta** from the per-task prompt.
5. **Commit.** First line = ticket ID. Body = symbol-prefixed lines per CONTRIBUTING.md (`+ - * ~ !`).
6. **Push.** `git push -u origin dev/ZMT-{task-id}`.
7. **Open the PR** against `main` immediately after the first push, before any iteration. Title: `ZMT-{task-id} — <task title>` (one ticket per PR per R-WORK-14). Body: the same symbol-prefixed list. Additional changes push onto the existing PR; do not wait until session end.
8. **Update any task-tracking document** referenced in the prompt with status on PR merge. Per R-WORK-10.

Standing rules above apply on every session; per-task prompts only add the delta.
