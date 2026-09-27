# NG — rationale

Long-form reasoning for the rules in `.claude/rules/ng.md`, keyed by rule ID. The Angular baseline is the framework's own AI best-practice guide.

## NG-1 — Standalone only

Standalone is the framework default. Writing `standalone: true` is noise, and NgModules add a layer of indirection for dependency declaration that the compiler no longer needs. `strictStandalone` makes a non-standalone declaration a compile error.

## NG-2 — Zoneless

Zone.js patches every async API and runs change detection after any of them fires. That hides which state change caused a render and costs time on every event. Zoneless change detection runs only when a signal read by a template changes, which matches the signal-first state model. Keeping zone.js out of the dependency tree prevents an accidental import from re-enabling it.

## NG-3 — OnPush default

OnPush is the default in the current major, so the rule bans the opt-out instead of requiring an explicit declaration, as the framework guide instructs. `Eager` and `Default` both reintroduce checking components whose inputs did not change.

## NG-4 — Signal I/O

`input()` returns a signal, so derived values are `computed()` from inputs instead of being recalculated in lifecycle hooks. `model()` expresses two-way binding in one declaration. Decorator I/O cannot participate in the signal graph.

## NG-5 — Native control flow

`@if` narrows types inside its block, `@for` requires a `track` expression, and neither needs a directive import. The structural-directive forms are superseded.

## NG-6 — inject() and @Service

`inject()` works in field initialisers and functions, not only constructors, which keeps DI uniform across components, stores and guards. `@Service()` declares a root singleton in one decorator.

## NG-7 — host object

A single `host` object in the decorator shows every host binding in one place and is statically analysable. It replaces scattered member decorators.

## NG-8 — Native class and style bindings

`[class.x]` and `[style.x]` are type-checked and need no import. `CommonModule` pulls in every built-in directive. Importing only what the template uses keeps the dependency set explicit.

## NG-9 — Lazy feature routes

An eager route puts its whole feature in the startup bundle. Lazy loading keeps startup cost flat as features are added. It is review-only today. The planned lint rule flags a `component:` property in feature route arrays.

## NG-10 — Signal Forms

Signal Forms model form state as signals, validated by schema, with type-safe field access. One form technology means one set of test patterns and one set of harnesses. Reactive and template-driven forms are excluded so they cannot coexist.

## NG-11 — Dirty-form dialogs

Escape, backdrop click and the close button are three routes to losing edits. A single helper that opens form dialogs and confirms on dirty close covers all three once. Restricting `MatDialog` imports to the helper's library makes the helper the only way in.

## NG-12 — Accessibility

The target is WCAG AA. The angular-eslint accessibility rules catch static template issues at edit time. Axe-core in every e2e smoke catches rendered issues: contrast, focus order, computed ARIA. Both fail CI.

## NG-13 — Exhaustive checkNoChanges

In zoneless mode, a binding that changes without notifying the scheduler shows stale UI. Exhaustive checking in dev re-verifies every view after each cycle and throws on such bindings, surfacing them during development instead of in production.

## NG-14 — NgOptimizedImage

`ngSrc` requires width and height (or `fill`), which prevents layout shift, and adds lazy loading and priority hints. It does not apply to inline base64 images.
