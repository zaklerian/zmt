---
paths:
  - "apps/renderer/**"
  - "libs/renderer/**"
---

# NG — Angular renderer

Format: `ID — rule. Why: … Enforced: mechanism (status).` Rationale: `docs/rationale/NG.md`.

NG-1 — Components, directives and pipes are standalone; no NgModules, and `standalone: true` is never written. Why: standalone is the framework default and NgModules add an indirection layer. Enforced: lint — `@angular-eslint/prefer-standalone`; type — `strictStandalone` (planned, ZMT-A-2).
NG-2 — The app bootstraps with `provideZonelessChangeDetection()`; zone.js is neither installed nor imported. Why: change detection runs only on signal changes, which keeps rendering predictable. Enforced: lint — `no-restricted-imports` on `zone.js`; test — app config spec (planned, ZMT-A-2).
NG-3 — Components rely on the default OnPush strategy; `ChangeDetectionStrategy.Eager` and `ChangeDetectionStrategy.Default` are never set. Why: the opt-out reintroduces unscoped checking. Enforced: lint — `no-restricted-syntax` on both members (planned, ZMT-A-2).
NG-4 — Component I/O uses `input()`, `output()` and `model()`; `@Input` and `@Output` decorators are not used. Why: signal-based I/O is typed and reactive end to end. Enforced: lint — `@angular-eslint/prefer-signals` + `no-restricted-syntax` on the decorators (planned, ZMT-A-2).
NG-5 — Templates use `@if`, `@for` and `@switch`. Why: native control flow is type-narrowing and needs no directive imports. Enforced: lint — `@angular-eslint/template/prefer-control-flow` (planned, ZMT-A-2).
NG-6 — Singleton services use `@Service()` (or `providedIn: 'root'`) and obtain dependencies with `inject()`; constructor injection is not used. Why: one DI style, usable in functions and field initialisers. Enforced: lint — `@angular-eslint/prefer-inject` (planned, ZMT-A-2).
NG-7 — Host bindings and listeners go in the decorator's `host` object; `@HostBinding` and `@HostListener` are not used. Why: one declarative host surface per component. Enforced: lint — `no-restricted-syntax` on both decorators (planned, ZMT-A-2).
NG-8 — Templates use `[class.x]` and `[style.x]` bindings; `NgClass`, `NgStyle` and `CommonModule` are not imported. Why: native bindings are typed and imports stay minimal. Enforced: lint — `no-restricted-imports` (planned, ZMT-A-2).
NG-9 — Feature routes load lazily through `loadComponent` or `loadChildren`. Why: startup cost stays independent of feature count. Enforced: review (active). DEBT: lint rule banning an eager `component:` in feature route arrays.
NG-10 — Forms use Signal Forms (`@angular/forms/signals`); `ReactiveFormsModule` and `FormsModule` are not imported. Why: one form model, schema-validated and signal-native. Enforced: lint — `no-restricted-imports` (planned, ZMT-A-2).
NG-11 — A dialog holding a form opens through the shared form-dialog helper, which confirms before discarding unsaved changes on Escape, backdrop click or close. Why: user edits are never lost silently. Enforced: lint — `no-restricted-imports` of `MatDialog` outside the dialog util library (planned, ZMT-A-2).
NG-12 — Templates meet WCAG AA: they pass the angular-eslint accessibility rules, and every e2e smoke runs axe-core with zero violations. Why: accessibility regressions fail CI instead of reaching users. Enforced: lint — angular-eslint template accessibility config; test — `@axe-core/playwright` (planned, ZMT-A-2).
NG-13 — Dev builds provide `provideCheckNoChangesConfig({ exhaustive: true })`. Why: surfaces bindings that change without notifying the zoneless scheduler. Enforced: test — app config spec (planned, ZMT-A-2).
NG-14 — Static images use `NgOptimizedImage` (`ngSrc`). Why: enforced sizing prevents layout shift. Enforced: lint — `@angular-eslint/template/prefer-ngsrc` (planned, ZMT-A-2).
