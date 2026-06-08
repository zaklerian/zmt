# ADR 002 — Renderer process isolation (runtime + type + lint)

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Electron applications run three distinct processes:

| Process  | Runtime           | Path                         | What it can do                    |
| -------- | ----------------- | ---------------------------- | --------------------------------- |
| Main     | Node.js           | `apps/electron/src/main/`    | `fs`, `path`, `child_process`, OS |
| Preload  | Privileged bridge | `apps/electron/src/preload/` | Limited Node + `contextBridge`    |
| Renderer | Chromium sandbox  | `apps/zmt/`                  | DOM, fetch, React — no Node       |

The renderer cannot `require('fs')` at runtime — Chromium throws — because the window
is created with `nodeIntegration: false`, `sandbox: true`, `contextIsolation: true`.

The failure mode this ADR addresses: if the renderer's TypeScript configuration
includes `"node"` in its `types` field, the compiler tells the developer "Node
globals exist in this project." A React component can then write `import fs from 'fs'`
with full autocomplete and zero type errors — and crash at runtime. The type system
would be _helping developers write code that breaks the runtime security model_.

## Decision

Enforce process isolation at three layers. Each layer alone is insufficient; together
they form defense in depth.

### Layer 1 — Runtime

In `createMainWindow()`:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  devTools: isDevMode(),
}
```

Chromium refuses to load Node modules in the renderer. CSP installed via
`webRequest.onHeadersReceived` with separate dev/prod policies. Navigation guards
(`setWindowOpenHandler`, `will-navigate`) prevent navigation away from the renderer
origin.

### Layer 2 — Type system

`apps/zmt/tsconfig.app.json` excludes `"node"` from the `types` field:

```jsonc
"types": [
  "@nx/react/typings/cssmodule.d.ts",
  "@nx/react/typings/image.d.ts",
  "vite/client"
  // no "node"
]
```

The renderer can still import `@contracts` (pure TypeScript interfaces with no
runtime). It cannot import or reference `fs`, `process`, `Buffer`, or any other Node
API without a type error.

### Layer 3 — Lint

`apps/zmt/eslint.config.mjs` adds `no-restricted-imports`:

```js
'no-restricted-imports': ['error', {
  paths: [
    { name: 'electron', message: 'Use window.api (typed via @contracts).' },
  ],
  patterns: [{
    group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'child_process', 'crypto'],
    message: 'Renderer runs in a sandboxed browser context. Use IPC.',
  }],
}]
```

If a developer or future config change re-introduces `"node"` types, ESLint still
slams the door before the code compiles.

## Consequences

**Positive**

- The type system reinforces the runtime — autocomplete suggests only what's actually
  available
- Three independent layers — skipping or breaking one is caught by the others
- Failures shift left: type error at IDE write time instead of crash at runtime
- The architecture is self-documenting: opening the renderer's tsconfig answers
  "what is this process allowed to do?"

**Negative**

- Main and preload need separate tsconfigs (already in place via `tsconfig.app.json`
  per app)
- New developers may briefly wonder why `fs` doesn't autocomplete in a React
  component — the lint error explains, and that's a teaching moment, not a flaw

## Alternatives considered

- **Trust the runtime alone** — rejected. Type errors are cheaper than runtime
  crashes. The cost of adding two more layers is near-zero.
- **Single tsconfig for the whole monorepo** — rejected. Conflates browser and Node
  contexts; the renderer would get DOM types and Node types simultaneously, which
  describes no real runtime environment.
