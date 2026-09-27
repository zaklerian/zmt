# ADR 007 — Runtime i18n without library

Status: Accepted · 2026-09-25

## Context
ZMT switches UI language at runtime without a reload, and the main process needs the same strings for native menus. Build-time i18n needs one build per locale and a reload to switch. Runtime libraries add a string-keyed API the compiler cannot check.

## Decision
- One TypeScript const dictionary per locale in a `scope:shared` project (I18N-1).
- `type Messages = DeepReadonly<typeof en>`; the base is not `as const`, so strings are widened; other locales `satisfies Messages`.
- Parameterised messages are typed functions.
- An I18nStore holds the locale signal; `messages` is `computed()`; templates read it directly (I18N-2).
- Non-default locales load by dynamic import; `Intl` APIs handle plurals, dates and numbers.
- `MatPaginatorIntl`, `DateAdapter` and main-process menus follow the locale (I18N-3).
- A workspace lint rule bans raw template text and literal user-facing attributes (I18N-4).

## Consequences
- Missing keys, extra keys and wrong parameters are compile errors; no library dependency.
- Locale switching is a signal change with no reload.
- No extraction tooling or translator file format; translators edit TypeScript.
- Material and native-menu integration is hand-written and covered by an e2e smoke.
