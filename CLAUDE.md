# ZMT

ZMT is a desktop mod manager for Paradox games: it reads, edits and writes mod files on disk through a hardened Electron shell with an Angular UI.

## Stack

Electron · Nx · TypeScript (strict+, ARCH-4) · Angular 22 (standalone, zoneless, Signals, native control flow, `input()`/`output()`/`model()`, OnPush default) · Angular Material M3 + CDK · NgRx SignalStore · Signal Forms · Valibot (IPC schemas) · Vitest · Playwright (`_electron`) · angular-eslint. Decision: ADR 001.

## Repo map

Every Nx project has one `type:` and one `scope:` tag (ARCH-1); the governance check fails when a `project.json` root is missing here (AI-12).

```
apps/main/                            Electron main: window, protocol, CSP, fs, plugins, IPC handlers   type:app  scope:main
apps/preload/                         contextBridge api derived from the channel constants               type:app  scope:preload
apps/renderer/                        Angular shell bootstrap, routes, window.api declaration           type:app  scope:renderer
apps/renderer-e2e/                    Playwright _electron smokes + axe   type:app          scope:renderer
libs/contracts/                       Valibot IPC schemas, channels, Result envelope   type:contracts  scope:shared
libs/shared/i18n/                     locale dictionaries, loaders        type:util         scope:shared
libs/renderer/core/                   domain-free renderer utilities: AsyncStatus, DialogService and confirm dialog, pending('ZMT-A-5') and NotImplementedError, window.api declaration   type:util    scope:renderer
libs/renderer/shell/                  app chrome: shell container (feature); toolbar, nav rail, footer, nav entries and messages tokens, route paths (ui); I18nStore, WorkspaceService and WorkspaceStore, APP_VERSION token, unsaved-changes guard (data-access)   type:domain  scope:renderer
libs/renderer/home/                   lazy home route (feature)           type:domain  scope:renderer
libs/renderer/mod-content/            mod content route (feature); file tree, search, editor, mode toggle, breadcrumbs (ui); ModContentService and the ModContent, FileTree, FileSearch and PlainEditor stores (data-access); file selection, tree item and view mode models (util)   type:domain  scope:renderer
libs/renderer/mod-info/               mod descriptor route (feature); descriptor Signal Form, parser warnings (ui); ModInfoService, ModInfoStore (data-access); descriptor values model, path helpers, lossless descriptor parser (util)   type:domain  scope:renderer
libs/renderer/tech-tree/              air tech tree route (feature); canvas, toolbar, actions, context menu, delete dialog (ui); TechTree, TechnologyForm and TechnologyDelete stores (data-access); canvas node, edge and delete plan models (util)   type:domain  scope:renderer
libs/renderer/app-settings/           settings and enabled-features routes (feature); plugin config and file display forms, feature list, tree placeholder (ui); AppSettingsStore, FeatureNavStore, PluginService (data-access); settings values model, feature toggle helper (util)   type:domain  scope:renderer
tools/eslint-rules/                   workspace lint rules                type:util         scope:shared
tools/commitlint-plugin/              commit grammar, pre-push check      type:util         scope:shared
tools/scripts/                        negative-typecheck, pin, push, electron-dev and renderer-vitest scripts
layout: libs/<scope>/<domain>/src/{feature,ui,data-access,util}, one Nx project per domain with one entry point per layer (@zmt/renderer/<domain>/<layer>); data-access holds *.service.ts (IPC facade) and *.store.ts; libs/renderer/core holds the domain-free renderer utilities
main layout: apps/main/src/<domain>/ (app, fs, ipc, plugin, system, window); handlers register through ipc/ipc-handle.util.ts only
.claude/                              rules, hooks, skills, settings
docs/                                 adr/, rationale/, ledger.md
```

## Commands

```
pnpm install --frozen-lockfile                 install (Node 24 via .nvmrc, pnpm via corepack)
pnpm nx serve main                             Electron dev: renderer dev server + main/preload watch + restart
pnpm nx serve renderer                         dev renderer in a browser only
pnpm nx run-many -t build -p main preload renderer   production bundles under dist/apps
pnpm nx affected -t lint typecheck test        the Stop-hook gate
pnpm nx run-many -t lint typecheck test build  full gate
pnpm nx e2e renderer-e2e                       Playwright _electron smokes with axe (builds first; xvfb-run on headless Linux)
pnpm nx run-many -t mutation -p contracts main Stryker gate, break 80 (TEST-3)
pnpm nx run-many -t mutation --projects 'renderer-*'   Stryker gate on renderer stores and services, break 70 (TEST-3)
pnpm nx run shared-i18n:typecheck-negative     dictionary parity fixtures must fail typecheck
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
