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
