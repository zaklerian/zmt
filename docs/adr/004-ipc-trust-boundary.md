# ADR 004 — IPC trust boundary

Status: Accepted · 2026-09-25

## Context
The renderer displays mod content from disk and is treated as untrusted. Main holds filesystem access. TypeScript types vanish at runtime, so type-only IPC checking trusts whatever arrives.

## Decision
- Valibot schemas in `libs/contracts` are the single source for channels, payloads, limits and sentinels. Types are inferred from them (SEC-1), deeply readonly via `v.readonly()` (SEC-7).
- Main parses and freezes every inbound payload before use (SEC-1).
- Every call returns a schema-defined Result envelope; failures carry `{ code, message }` with HTTP-style codes and nothing is thrown across IPC (SEC-4, ADR 008).
- Filesystem APIs take a branded `SafePath` minted only by the path guard (SEC-3).
- Windows run with `contextIsolation`, `sandbox`, `nodeIntegration: false`, sender-frame validation, a strict CSP, and no remote navigation or `window.open` (SEC-2).
- Renderer imports of Node or `electron` fail lint and type checks (ARCH-3).

## Consequences
- A hostile or buggy payload stops at the boundary with a structured error.
- Every channel costs a schema and a contract test; the schema replaces the hand-written type.
- Parsing adds per-call overhead; payload limits keep it bounded.
- Each boundary has at least two independent layers (SEC-6).
