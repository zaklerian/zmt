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

SEC-1 — Valibot schemas in `libs/contracts` are the single source for every IPC channel name, payload, limit and result; TypeScript types are inferred from them, and main parses and freezes every inbound payload before use. Why: one definition per wire shape, and malformed or hostile payloads stop at the boundary. Enforced: type — `v.InferOutput`; lint — `no-restricted-syntax` allowing `ipcMain.handle` only inside the typed handler helper and `ipcRenderer` only inside the typed invoke helper; test — contract round-trip specs and the handler-registration spec requiring a contract per channel (active).
SEC-2 — Windows run with `contextIsolation`, `sandbox` and `nodeIntegration: false`; main validates the sender frame of every IPC call; a strict CSP is installed; navigation and `window.open` to remote content are denied. Why: a compromised renderer gains no privileged access. Enforced: test — window-factory, IPC-helper and protocol specs, plus the Electron e2e smoke asserting no Node globals, blocked navigation and the served CSP (active).
SEC-3 — Filesystem APIs accept only `SafePath`, a branded type minted solely by the path guard. Why: an unguarded path cannot compile. Enforced: type — brand; lint — `no-restricted-syntax` on `as SafePath` outside the guard (active).
SEC-4 — Every IPC call returns a Result envelope, `{ ok: true, data }` or `{ ok: false, error: { code, message } }`, with HTTP-style numeric codes from a closed contracts schema; nothing is thrown across IPC and the renderer never receives a raw error string. Why: the renderer can branch on failure kinds, and internals do not leak. Enforced: type — result schema; test — contract round-trip and handler specs mapping every failure to an envelope (active).
SEC-5 — Dependencies are pinned to exact versions, with no `^` or `~` ranges. Why: auto-applied patches are a supply-chain entry point. Enforced: hook — `saveExact` in `pnpm-workspace.yaml` and `.npmrc`, plus a lefthook pre-commit and CI scan of `package.json` (active).
SEC-6 — Each process boundary is enforced by at least two independent layers (runtime flag, type, lint, test). Why: one layer alone fails quietly. Enforced: review (active). DEBT: governance check requiring each SEC rule's enforcement to name two or more mechanisms.
SEC-7 — Every exported Valibot object or array schema ends in `v.readonly()`, so its inferred type is deeply readonly. Why: couples ARCH-7 immutability with SEC-1 inference. Enforced: type — a DeepReadonly equality assertion spec in `libs/contracts`, run by typecheck and test (active).
