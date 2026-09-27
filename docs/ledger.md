# Decision ledger

One line per decision, oldest first: `- date · decision · ADR link` (use `—` when no ADR applies). A deferred decision ends with `· revisit: <condition>`. A recurring review finding carries `finding:<slug>` (PROC-9). Format checked by the governance script (PROC-6).

- 2026-09-25 · Tech stack: Electron, Nx, strict TypeScript, Angular 22 zoneless, Material M3, NgRx SignalStore, Signal Forms, Valibot, Vitest, Playwright · [ADR 001](adr/001-tech-stack.md)
- 2026-09-25 · Renderer layering: service as IPC facade, SignalStore, container/ui split by Nx tags · [ADR 002](adr/002-renderer-layering.md)
- 2026-09-25 · Testing strategy: tests from day one, pyramid per layer, mutation testing on contracts and main · [ADR 003](adr/003-testing-strategy.md)
- 2026-09-25 · IPC trust boundary: Valibot schemas, parsed and frozen payloads, SafePath brand, Electron hardening · [ADR 004](adr/004-ipc-trust-boundary.md)
- 2026-09-25 · AI governance layout: short CLAUDE.md, path-scoped rules, skills, hooks, rule-reviewer agent, MCP servers · [ADR 005](adr/005-ai-governance-layout.md)
- 2026-09-25 · Claude Code commits but never pushes; push and PR are owner steps at AWAITING REVIEW · [ADR 005](adr/005-ai-governance-layout.md)
- 2026-09-25 · Rule-ID scheme DOMAIN-N across ARCH, NG, STATE, TEST, SEC, PROC, AI, I18N · [ADR 006](adr/006-rule-id-scheme.md)
- 2026-09-25 · Runtime i18n without a library: typed dictionaries, I18nStore, Intl APIs · [ADR 007](adr/007-runtime-i18n.md)
- 2026-09-25 · Artifact file suffixes kept, with generator defaults set to match (ARCH-10) · —
- 2026-09-25 · Retro procedure skill deferred; retro format stays enforced by PROC-8 · — · revisit: first ZMT sprint retro
- 2026-09-27 · Claude Code pushes its dev|hotfix/ZMT-A-* branch and opens the PR; push to main and force push are denied by settings and the lefthook pre-push hook; reverses the 2026-09-25 owner-push line · [ADR 005](adr/005-ai-governance-layout.md)
- 2026-09-27 · ZMT-A-2 toolchain makes ARCH-1–12, ARCH-14, ARCH-15, ARCH-17, NG-1–8, NG-10–14, STATE-1–5, TEST-1, TEST-2, SEC-5, PROC-1–4, PROC-10, I18N-1, I18N-2, I18N-4 and AI-12 active; ARCH-16, SEC-1–4, SEC-7, TEST-3 and the native-menu part of I18N-3 move to ZMT-A-3 · —
- 2026-09-27 · ARCH-12 is enforced by check-file/filename-blocklist on artifact-kind folders, and ARCH-11 carries a DEBT for .scss names, which ESLint does not parse · —
- 2026-09-27 · Toolchain pins Node 24.21.0 LTS and pnpm 11.27.1; pnpm 12 is deferred as a month-old major · — · revisit: Nx documents pnpm 12 support
- 2026-09-27 · TypeScript is pinned to 6.0.3 because Angular 22 declares typescript >=6.0 <6.1; TypeScript 7 is deferred · — · revisit: Angular widens its TypeScript peer range
- 2026-09-27 · Renderer libraries stay non-buildable; their unit tests run through @angular/build:unit-test against renderer:build:development · —
- 2026-09-27 · Angular's app config file is named app-config.const.ts so it carries an ARCH-10 suffix · —
- 2026-09-27 · Signal Forms over a readonly model interface bound to a Material form field pass ARCH-7 lint and specs; no form-model override is needed · —
- 2026-09-27 · The renderer reads its version from the root package.json through a named JSON import, allowed by one enforce-module-boundaries allow entry · —
- 2026-09-27 · MatPaginatorIntl and DateAdapter locale wiring (I18N-3) is deferred until a paginator or datepicker exists · — · revisit: first paginator or datepicker lands
- 2026-09-27 · Stryker runs once on libs/shared/i18n as a setup smoke without a gate; the break threshold is deferred to contracts and main (TEST-3) · — · revisit: ZMT-A-3 adds libs/contracts or apps/main
