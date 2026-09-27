---
name: new-feature
description: Scaffold a new renderer feature in ZMT — data-access service (IPC facade) and SignalStore, a feature container component, a ui presentational component, their specs and barrels, Nx tags and a lazy route. Use when asked to "add a feature", "create a screen/page/view for X", "scaffold X", or to start any new renderer domain that needs its own store. Not for adding a method to an existing service or store.
---

# New renderer feature

Layering per ADR 002. Rules cited by ID. Scaffold with Nx and Angular generators (use the Nx and Angular CLI MCP servers to look up generator options); do not write `project.json` by hand.

## Inputs to settle first

- Domain noun (kebab-case), e.g. `mod-list` (ARCH-11, ARCH-12).
- IPC namespace the feature reads from; its Valibot schemas must already exist in `libs/contracts` (SEC-1). If not, add them first, with contract tests (TEST-1).

## Steps

1. **data-access project** `libs/renderer/<domain>/data-access` — tags `type:data-access`, `scope:renderer` (ARCH-1).
   - `<domain>.service.ts`: `@Service()`, `inject()`, the only caller of the preload namespace; returns contract-inferred types (NG-6, STATE-5).
   - `<domain>.store.ts`: `signalStore` with a discriminated status union (STATE-3); loads via `rxMethod` + `switchMap` or `resource()` (STATE-2); derived values via `withComputed` (STATE-1).
   - Specs: `<domain>.service.spec.ts` (mock the preload API), `<domain>.store.spec.ts` (mock the service).
2. **ui project** `libs/renderer/<domain>/ui` — tags `type:ui`, `scope:renderer`.
   - `<name>.component.ts`: `input()`/`output()`/`model()` only, no injected stores or services (ARCH-2, NG-4); native control flow (NG-5); strings from `messages()` (I18N-4).
   - Spec through a CDK component harness (TEST-1, TEST-2).
3. **feature project** `libs/renderer/<domain>/feature` — tags `type:feature`, `scope:renderer`.
   - `<domain>.component.ts`: container; injects the store, passes signals to ui components.
   - `<domain>.routes.ts`: exported routes loaded lazily from the app routes (NG-9).
4. **Barrels**: each project's `index.ts` is `export * from './file'` per public file (ARCH-9).
5. **Types**: every declared property `readonly`, arrays `readonly T[]` (ARCH-7).
6. **i18n**: add message keys to the base dictionary and every locale (I18N-1).
7. **e2e**: one Playwright `_electron` smoke for the feature, including an axe-core scan (TEST-1, NG-12).
8. **Repo map**: add the new projects to the map in `CLAUDE.md` (AI-12).

## Done when

`npx nx affected -t lint typecheck test` passes and the Stop hook exits 0. Then use the `commit` skill.
