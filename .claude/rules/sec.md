---
paths:
  - "apps/main/**"
  - "apps/preload/**"
  - "libs/main/**"
  - "libs/contracts/**"
  - "package.json"
---

# SEC — process boundary and supply chain

Format: `ID — rule. Why: … Enforced: mechanism (status).` Rationale: `docs/rationale/SEC.md`.

SEC-1 — Valibot schemas in `libs/contracts` are the single source for every IPC channel name, payload, limit and sentinel; TypeScript types are inferred from them, and main parses and freezes every inbound payload before use. Why: one definition per wire shape, and malformed or hostile payloads stop at the boundary. Enforced: type — `v.InferOutput`; lint — `no-restricted-syntax` allowing `ipcMain.handle` only inside the typed handler helper; test — contract tests (planned, ZMT-A-2).
SEC-2 — Windows run with `contextIsolation`, `sandbox` and `nodeIntegration: false`; main validates the sender frame of every IPC call; a strict CSP is installed; navigation and `window.open` to remote content are denied. Why: a compromised renderer gains no privileged access. Enforced: test — window-factory and IPC-helper specs (planned, ZMT-A-2).
SEC-3 — Filesystem APIs accept only `SafePath`, a branded type minted solely by the path guard. Why: an unguarded path cannot compile. Enforced: type — brand; lint — `no-restricted-syntax` on `as SafePath` outside the guard (planned, ZMT-A-2).
SEC-4 — Main handlers fail with a structured `{ code, message }` error, using HTTP-style numeric codes defined by a contracts schema; the renderer never receives a raw error string. Why: the renderer can branch on failure kinds, and internals do not leak. Enforced: type — result schema; test — contract round-trip (planned, ZMT-A-2).
SEC-5 — Dependencies are pinned to exact versions, with no `^` or `~` ranges. Why: auto-applied patches are a supply-chain entry point. Enforced: hook — `.npmrc save-exact=true` + lefthook pre-commit scan of `package.json` (planned, ZMT-A-2).
SEC-6 — Each process boundary is enforced by at least two independent layers (runtime flag, type, lint, test). Why: one layer alone fails quietly. Enforced: review (active). DEBT: governance check requiring each SEC rule's enforcement to name two or more mechanisms.
SEC-7 — Every exported Valibot object or array schema ends in `v.readonly()`, so its inferred type is deeply readonly. Why: couples ARCH-7 immutability with SEC-1 inference. Enforced: type — a DeepReadonly equality assertion file in `libs/contracts`, run by typecheck (planned, ZMT-A-2).
