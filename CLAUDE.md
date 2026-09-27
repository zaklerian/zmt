# ZMT

ZMT is a desktop mod manager for Paradox games: it reads, edits and writes mod files on disk through a hardened Electron shell with an Angular UI.

## Stack

Electron · Nx · TypeScript (strict+, ARCH-4) · Angular 22 (standalone, zoneless, Signals, native control flow, `input()`/`output()`/`model()`, OnPush default) · Angular Material M3 + CDK · NgRx SignalStore · Signal Forms · Valibot (IPC schemas) · Vitest · Playwright (`_electron`) · angular-eslint. Decision: ADR 001.

## Repo map

Every Nx project has one `type:` and one `scope:` tag (ARCH-1); the governance check fails when a `project.json` root is missing here (AI-12). Planned entries arrive with the Electron shell in ZMT-A-3.

```
apps/renderer/                        Angular shell bootstrap, routes     type:app          scope:renderer
apps/renderer-e2e/                    Playwright smokes + axe             type:app          scope:renderer
libs/shared/i18n/                     locale dictionaries, loaders        type:util         scope:shared
libs/renderer/i18n/data-access/       I18nStore                           type:data-access  scope:renderer
libs/renderer/app-info/data-access/   APP_VERSION token                   type:data-access  scope:renderer
libs/renderer/shell/feature/          toolbar, rail, locale switcher      type:feature      scope:renderer
libs/renderer/home/feature/           lazy home route                     type:feature      scope:renderer
tools/eslint-rules/                   workspace lint rules                type:util         scope:shared
tools/commitlint-plugin/              commit grammar, pre-push check      type:util         scope:shared
tools/scripts/                        negative-typecheck, pin and push scripts
planned: apps/main/ (type:app scope:main) · apps/preload/ (type:app scope:preload) · libs/contracts/ (type:contracts scope:shared)
layout: libs/<scope>/<domain>/{feature,ui,data-access,util}; renderer data-access holds *.service.ts (IPC facade) and *.store.ts
.claude/                              rules, hooks, skills, settings
docs/                                 adr/, rationale/, ledger.md
```

## Commands

```
pnpm install --frozen-lockfile                 install (Node 24 via .nvmrc, pnpm via corepack)
pnpm nx serve renderer                         dev renderer
pnpm nx affected -t lint typecheck test        the Stop-hook gate
pnpm nx run-many -t lint typecheck test build  full gate
pnpm nx e2e renderer-e2e                       Playwright smokes with axe
pnpm nx run shared-i18n:typecheck-negative     dictionary parity fixtures must fail typecheck
pnpm nx run shared-i18n:mutation               Stryker smoke (gate lands on contracts and main in ZMT-A-3)
pnpm commitlint                                commit grammar (reads stdin or --edit)
bash .claude/hooks/governance.sh               rule, rationale, ADR, ledger, repo-map and retro checks
bash .claude/hooks/verify.sh                   governance + nx gate
```

## Tickets, branches, commits

- Ticket IDs: `ZMT-A-<N>`; subtasks `ZMT-A-<N>.<M>` ship as their own PR before the parent (PROC-3).
- Branches: `dev/ZMT-A-<N>` or `hotfix/ZMT-A-<N>`, from updated `main`. File edits on any other branch are blocked by a hook (PROC-1).
- Commits: first line is the ticket ID; body lines use `+` added, `-` removed, `*` changed, `~` fixed, `!` breaking (PROC-2). Use the `commit` skill; Option B body when the change spans more than one project or more than five files (PROC-10).
- Claude Code commits, pushes its ticket branch and opens the PR (`ZMT-A-<N> — <title>`); pushing to `main` and force-pushing are denied (settings and lefthook pre-push). Squash-merge to `main`.

## Rules

Rules live in `.claude/rules/<domain>.md`, one per line: `ID — rule. Why: … Enforced: mechanism (status).` Domain files with `paths:` frontmatter load when you work on matching files; `arch`, `proc` and `ai` apply everywhere.

| Prefix | Domain | Scope |
|---|---|---|
| ARCH | architecture, structure, TypeScript | repo-wide |
| NG | Angular renderer | apps/renderer, libs/renderer |
| STATE | renderer state and data flow | apps/renderer, libs/renderer |
| TEST | tests | specs, e2e |
| SEC | IPC boundary, Electron, supply chain | main, preload, contracts |
| PROC | branches, commits, ADRs, ledger, sprints | repo-wide |
| AI | how Claude Code works here | repo-wide |
| I18N | runtime localisation | renderer, shared, main |

- Enforcement is one of lint, hook, type, test or review; status is `active` or `planned` (planned items name the ticket that ships them).
- `DEBT:` marks a review-only rule and names the mechanism it lacks.
- The reasoning behind each rule is in `docs/rationale/<DOMAIN>.md` under the same ID; read it when a rule's edge case is unclear.
- Cite rules by ID in prompts, reviews and lint override names (`ZMT-A-<N>: <reason>`).

Working posture:
- Critique by default (AI-4).
- Scope agreement to the item at hand (AI-5).
- Stop and name any conflict with a rule, ADR or ledger line (AI-6).
- Number questions Q1… across the thread (AI-7).
- Add no code comments (AI-13).

## Tooling

- Skills: `new-feature`, `commit`, `new-adr`, `ledger-entry`.
- Subagent: `rule-reviewer` audits the diff against rule IDs.
- MCP: Angular CLI and Nx servers for generators, docs and best practices.
- Hooks:
  - PreToolUse: branch check and no-new-comments.
  - PostToolUse: prettier + eslint on the edited file.
  - Stop: `verify.sh`.
- Git hooks (lefthook): pre-commit prettier, eslint and the exact-pin scan; commit-msg commitlint; pre-push ticket-branch check.

## References

@docs/sprint-protocol.md
@docs/ledger.md

ADRs: `docs/adr/` (001 stack · 002 renderer layering · 003 testing · 004 IPC trust boundary · 005 AI governance layout · 006 rule-ID scheme · 007 runtime i18n).
