---
name: new-feature
description: Scaffold a new renderer domain in ZMT — one Nx project with data-access (IPC facade service and SignalStore), ui (presentational component) and feature (container and lazy route) layer folders, their specs, barrels, path aliases and tags. Use when asked to "add a feature", "create a screen/page/view for X", "scaffold X", or to start any new renderer domain that needs its own store. Not for adding a method to an existing service or store.
---

# New renderer domain

Layering per ADR 002. Rules cited by ID. Copy the project files (`project.json`, `tsconfig*.json`, `vitest.config.mts`, `stryker.config.mjs`) from an existing domain such as `libs/renderer/mod-info` and generate components and services with the Angular generators (use the Nx and Angular CLI MCP servers to look up generator options).

## Inputs to settle first

- Domain noun (kebab-case), e.g. `mod-list` (ARCH-11, ARCH-12).
- IPC namespace the feature reads from; its Valibot schemas must already exist in `libs/contracts` (SEC-1). If not, add them first, with contract tests (TEST-1).

## Steps

1. **Domain project** `libs/renderer/<domain>` — tags `type:domain`, `scope:renderer` (ARCH-1); layer folders `src/{data-access,ui,feature}` (plus `src/util` for models shared by ui and data-access), each with an `index.ts` and a `@zmt/renderer/<domain>/<layer>` path in `tsconfig.base.json`; imports between the layers of one domain are relative (`../data-access`), imports across domains use the path aliases.
2. **data-access folder** `src/data-access`
   - `<domain>.service.ts`: `@Service()`, `inject()`, the only caller of the preload namespace; returns contract-inferred types (NG-6, STATE-5).
   - `<domain>.store.ts`: `signalStore` with a discriminated status union (STATE-3); loads via `rxMethod` + `switchMap` or `resource()` (STATE-2); derived values via `withComputed` (STATE-1).
   - Specs: `<domain>.service.spec.ts` (mock the preload API), `<domain>.store.spec.ts` (mock the service); the `mutation` target runs them under Stryker (TEST-3).
3. **ui folder** `src/ui`
   - `<name>.component.ts`: `input()`/`output()`/`model()` only, no injected stores or services and no import from `data-access` or `feature` (ARCH-2, NG-4); native control flow (NG-5); strings from `messages()` (I18N-4).
   - Spec through a CDK component harness (TEST-1, TEST-2).
4. **feature folder** `src/feature`
   - `<domain>.component.ts`: container; injects the store, passes signals to ui components.
   - `<domain>.routes.ts`: exported routes loaded lazily from the app routes (NG-9).
5. **Barrels**: each layer folder's `index.ts` is `export * from './file'` per public file (ARCH-9).
6. **Types**: every declared property `readonly`, arrays `readonly T[]` (ARCH-7).
7. **i18n**: add message keys to the base dictionary and every locale (I18N-1).
8. **e2e**: one Playwright `_electron` smoke for the feature, including an axe-core scan (TEST-1, NG-12).
9. **Repo map**: add the new project to the map in `CLAUDE.md` (AI-12).

## Done when

`npx nx affected -t lint typecheck test` passes and the Stop hook exits 0. Then use the `commit` skill.
