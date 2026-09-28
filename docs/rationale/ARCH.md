# ARCH — rationale

Long-form reasoning for the rules in `.claude/rules/arch.md`, keyed by rule ID. The rule text lives only in the rule file.

## ARCH-1 — Nx tag matrix

The tag pair answers two independent questions: which process the code runs in (`scope:`) and which kind of library it is (`type:`). `@nx/enforce-module-boundaries` checks both on every import, so a renderer project importing a main-process library, or a util library importing a domain, fails lint instead of review. Until ZMT-A-D2 the `type:` tag also carried the layer, with one project per layer per domain; the ZMT-A-1 survey showed that multiplied projects and Angular test builds without adding cohesion, so layers became folders inside one project per domain and their constraints moved to ARCH-2. The project graph also drives `nx affected`, which keeps the Stop hook fast. See ADR 002.

## ARCH-2 — Presentational layer

A `ui` component that injects a store is coupled to one feature and can only be tested with that store mocked. Restricting the ui layer to `input()`, `output()` and `model()` keeps components pure functions of their inputs, testable through CDK harnesses alone. The split is structural: `no-restricted-imports` blocks scoped to `libs/renderer/*/src/<layer>/**` ban the relative paths and the `@zmt/renderer/*/<layer>` entry points a layer may not reach, so a ui file cannot import a data-access folder or a store at all. The same blocks keep data-access away from ui and feature, util away from all three, and features away from other features, which is the order the Nx tag matrix enforced before ZMT-A-D2. `tools/eslint-rules/src/layer-boundaries.spec.ts` resolves the workspace config for each layer path and asserts the bans fire, so a regression in the config fails the test gate.

## ARCH-3 — Renderer isolation

The renderer is a Chromium page with `sandbox` on, so Node modules fail at runtime anyway. Catching the import at lint and type level turns a runtime crash, or a silent bundler polyfill, into an immediate error. The contracts library is the only code both sides share, which makes it the audit point for the wire. Runtime, type and lint layers together satisfy SEC-6.

## ARCH-4 — Compiler strictness

Each flag closes a defect class. `noUncheckedIndexedAccess`: indexing may return `undefined`. `exactOptionalPropertyTypes`: an optional field is not the same as a field set to `undefined`, which also makes the `null`/`undefined` split enforceable. `noPropertyAccessFromIndexSignature`: dynamic keys are visibly dynamic. `verbatimModuleSyntax`: type-only imports are explicit, which bundlers rely on. `noImplicitOverride`: a renamed base method breaks the subclass loudly. Angular `strictTemplates` extends the same checking into templates. The flags apply repo-wide, main included, because the trust boundary sits in main.

## ARCH-5 — satisfies over as

`as` asserts, `satisfies` checks. An `as` can hide a missing field that `satisfies` would report, and `satisfies` keeps the narrow inferred type for later use. Object-literal assertions are banned outright because they are the most common way to hide missing fields.

## ARCH-6 — No enums

TypeScript enums emit runtime objects, allow reverse mapping for numeric members, and behave nominally in ways unions do not. A `const` object with a derived union gives the same autocomplete, is plain data, serialises unchanged across IPC, and pairs with Valibot's `v.picklist`.

## ARCH-7 — Readonly by declaration

Mutation of shared data is the defect: a store slice, an IPC payload or an input array edited in place changes state behind the owner's back. The check is syntactic, with no type information, so it is fast and predictable on every declared property and array type.

TypeScript `readonly` exists only at compile time, and a readonly property is assignable to a mutable type, so the compiler alone cannot guarantee immutability. Runtime backstops are part of the rule: SignalStore dev-mode state freezing stays on, and IPC payloads are frozen at the contracts boundary when main parses them (SEC-1).

Third-party APIs that take mutable arrays get a `[...x]` copy at the call site by default. A named override (ARCH-17) is reserved for performance-sensitive paths where the copy is measurably costly.

## ARCH-8 — Handled promises

An unhandled rejection in the renderer disappears into the console, and the UI stays in a loading state forever. Requiring every promise to be awaited, returned or marked `void` forces an explicit decision. `no-misused-promises` catches promises passed where a void callback is expected, such as event handlers.

## ARCH-9 — Passive barrels

`export *` per file means a barrel is derivable from the folder listing and never curated. Named re-exports create a second surface that drifts from the files and hides renames. The trade-off accepted: public surface is controlled by what files export, not by the barrel.

## ARCH-10 — Artifact suffixes

The framework style guide drops suffixes; ZMT keeps them. A suffix makes a file's role visible in tabs, search results and review diffs, and `**/*.store.ts` finds every store in one glob. Several lint rules (STATE-2, STATE-5) key off the suffix, so it is also a lint anchor. Generator defaults are configured to emit the suffixes, so no one types them by hand.

## ARCH-11 — kebab-case

macOS and Windows filesystems are case-insensitive by default, and Linux CI is not. One casing removes a class of works-locally, fails-in-CI import errors.

## ARCH-12 — Domain grouping

Files that change together should sit together. A feature split into `components/`, `services/` and `models/` scatters one change across three folders. The layer folders `feature`, `ui`, `data-access` and `util` are the one sanctioned split inside a domain project, so artifact-kind folders below them would duplicate it at a worse granularity.

## ARCH-13 — Rule of three

Two consumers are not enough evidence of the right abstraction; the first extraction usually encodes one consumer's assumptions. The third consumer is a precondition, not one criterion among several. Once it is met, the surface must be stable, the core domain-free, and the reuse worth the indirection. The cost of duplication before extraction is accepted.

## ARCH-14 — Sorted imports and keys

Order that carries no meaning should be deterministic, so diffs show only real changes and no one debates it. The autofixer does the work via the PostToolUse hook. Genuinely meaningful order is kept through a named override (ARCH-17). Validation order in a schema is one example.

## ARCH-15 — Naming by kind

Casing tells a reader whether a symbol is a type, a value or a constant without jumping to its definition. The lint rule keeps generated and hand-written code consistent.

## ARCH-16 — Dev userData

Pointing `app.setPath('userData', …)` at a dev-specific directory once, at startup, separates every persisted artefact at the same time: config, caches, logs and future stores. Per-file naming conventions miss new files. The startup spec asserts the path switch happens before any store is constructed.

## ARCH-17 — Named lint overrides

Inline `eslint-disable` comments scatter exceptions across the codebase, where no one reviews them as a set. With inline configuration disabled, every exception lives in `eslint.config.mjs` under a name that carries its ticket and reason, scoped by the narrowest glob. The list of exceptions is then one readable, reviewable block, and `reportUnusedDisableDirectives` removes overrides that no longer suppress anything.
