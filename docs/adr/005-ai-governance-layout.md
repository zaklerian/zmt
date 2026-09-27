# ADR 005 — AI governance layout

Status: Accepted · 2026-09-25

## Context
Claude Code reads `CLAUDE.md` on every turn, so a long file dilutes attention. Rules phrased "always/never" hold only if something enforces them.

## Decision
- `CLAUDE.md` (≤150 lines): purpose, stack, repo map, commands, grammar, protocol summary.
- `.claude/rules/*.md`: terse rules, one file per domain, path-scoped through `paths:` frontmatter.
- `docs/rationale/<DOMAIN>.md`: long-form reasoning keyed by rule ID. Rule text lives only in the rule files.
- Skills for procedures: `new-feature`, `commit`, `new-adr`, `ledger-entry`.
- Hooks for invariants:
  - PreToolUse: branch check and no-new-comments.
  - PostToolUse: format and lint the edited file.
  - Stop: governance checks plus `nx affected`.
- A read-only `rule-reviewer` subagent audits diffs; MCP servers for the Angular CLI and Nx.
- Every rule declares its enforcement, and review-only rules carry a DEBT note (AI-1).
- Claude Code commits, pushes only `dev|hotfix/ZMT-A-*` branches and opens the PR; push to `main` and force push are denied (ledger 2026-09-27).

## Consequences
- Always-loaded context stays small; domain rules load only for matching paths.
- The DEBT notes form a visible backlog of missing mechanical enforcement.
- Rules, rationale and hooks must change together; the governance check catches ID drift.
