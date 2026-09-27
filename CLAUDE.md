# ZMT

ZMT is a desktop mod manager for Paradox games: it reads, edits and writes mod files on disk through a hardened Electron shell with an Angular UI.

## Stack

Electron · Nx · TypeScript (strict+, ARCH-4) · Angular 22 (standalone, zoneless, Signals, native control flow, `input()`/`output()`/`model()`, OnPush default) · Angular Material M3 + CDK · NgRx SignalStore · Signal Forms · Valibot (IPC schemas) · Vitest · Playwright (`_electron`) · angular-eslint. Decision: ADR 001.

## Repo map

Planned Nx layout; projects land in ZMT-A-2. Every project has one `type:` and one `scope:` tag (ARCH-1).

```
apps/
  main/                        Electron main process          type:app  scope:main
  preload/                     contextBridge API              type:app  scope:preload
  renderer/                    Angular shell and routes       type:app  scope:renderer
  renderer-e2e/                Playwright _electron smokes
libs/
  contracts/                   Valibot schemas, channels, error codes   type:contracts scope:shared
  shared/<name>/               cross-process utils, i18n dictionaries   type:util      scope:shared
  main/<domain>/data-access    main-side services (fs, stores)          type:data-access scope:main
  main/<domain>/util           main-side pure helpers                   type:util      scope:main
  renderer/<domain>/feature    containers, routes                        type:feature   scope:renderer
  renderer/<domain>/ui         presentational components                 type:ui        scope:renderer
  renderer/<domain>/data-access  *.service.ts (IPC facade), *.store.ts   type:data-access scope:renderer
  renderer/<domain>/util       renderer pure helpers                     type:util      scope:renderer
tools/eslint-rules/            workspace lint rules
.claude/                       rules, hooks, skills, agents, settings
docs/                          adr/, rationale/, ledger.md, sprint-protocol.md
```

## Commands

Available after ZMT-A-2:

```
npm ci                                   install
npx nx serve renderer                    dev renderer
npx nx run main:serve                    dev Electron
npx nx affected -t lint typecheck test   the Stop-hook gate
npx nx e2e renderer-e2e                  Playwright smokes
npx nx run contracts:mutation            Stryker on contracts
```

Available now:

```
bash .claude/hooks/governance.sh         rule, rationale, ADR, ledger and retro checks
bash .claude/hooks/verify.sh             governance + nx gate (nx skipped without node_modules)
```

## Tickets, branches, commits

- Ticket IDs: `ZMT-A-<N>`; subtasks `ZMT-A-<N>.<M>` ship as their own PR before the parent (PROC-3).
- Branches: `dev/ZMT-A-<N>` or `hotfix/ZMT-A-<N>`, from updated `main`. File edits on any other branch are blocked by a hook (PROC-1).
- Commits: first line is the ticket ID; body lines use `+` added, `-` removed, `*` changed, `~` fixed, `!` breaking (PROC-2). Use the `commit` skill; Option B body when the change spans more than one project or more than five files (PROC-10).
- Claude Code commits but does not push. Push and PR (`ZMT-A-<N> — <title>`) are owner steps. Squash-merge to `main`.

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

- Enforcement is one of lint, hook, type, test or review; status is `active` or `planned` (toolchain lands in ZMT-A-2).
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

## References

@docs/sprint-protocol.md
@docs/ledger.md

ADRs: `docs/adr/` (001 stack · 002 renderer layering · 003 testing · 004 IPC trust boundary · 005 AI governance layout · 006 rule-ID scheme · 007 runtime i18n).
