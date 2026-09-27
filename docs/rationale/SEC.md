# SEC — rationale

Long-form reasoning for the rules in `.claude/rules/sec.md`, keyed by rule ID. Boundary decision: ADR 004.

## SEC-1 — Schemas as the single source

A TypeScript type describes what the renderer claims to send; a schema checks what actually arrived. Deriving the types from Valibot schemas means there is one definition per wire shape, and it cannot disagree with the runtime check. Main parses every inbound payload, key and value alike, because the renderer is treated as untrusted. Parsed payloads are frozen, which backs ARCH-7 at runtime. Channel names, limits and sentinels live beside the schemas, so both processes import the same constant.

## SEC-2 — Electron hardening

`contextIsolation` and `sandbox` keep renderer scripts away from Node and the preload's scope. Sender-frame validation rejects IPC from unexpected frames. A strict CSP blocks injected scripts. Denying navigation and `window.open` to remote origins prevents the window from loading content the app did not ship. Each is one line to disable by accident, which is why a spec asserts them.

## SEC-3 — SafePath brand

A path guard that services must remember to call fails the first time someone forgets. A branded `SafePath` that only the guard can produce moves the check to the type system: a filesystem function taking `SafePath` cannot be called with a raw string. Banning `as SafePath` outside the guard closes the cast escape hatch.

## SEC-4 — Structured errors

Electron serialises thrown values across IPC as strings, destroying structure. A contract-defined `{ code, message }` result lets the renderer branch on the failure kind and map codes to localized messages. HTTP-style numeric codes are a widely known taxonomy and range-checkable: 5xx is unexpected. Raw internal messages never reach the UI.

## SEC-5 — Exact pins

Range specifiers let a compromised patch release install without anyone choosing it. Exact pins route every dependency change through a reviewed diff of `package.json` and the lockfile. `.npmrc` sets exact saving by default, and a pre-commit scan rejects ranges that arrive by hand.

## SEC-6 — Defense in depth

A single enforcement layer fails quietly: a lint rule can be overridden, a runtime flag flipped, a type widened. Each boundary therefore carries at least two independent layers. For example, renderer isolation is enforced by the runtime sandbox, the renderer's types and lint. This is review-only today. The planned check reads each SEC rule's enforcement and requires two or more mechanisms.

## SEC-7 — Readonly schema outputs

Valibot infers mutable types by default, so a contract type would silently violate ARCH-7. Ending every exported object and array schema in `v.readonly()` produces deeply readonly inferred types. A compile-time assertion file compares each exported schema's output with `DeepReadonly` of itself and fails typecheck when one is missing the modifier. This rule is the link between ARCH-7 (immutability) and SEC-1 (types come from schemas).
