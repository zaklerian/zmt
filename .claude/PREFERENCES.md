# Preferences

Project-specific overrides and elaborations. Each preference references the rule it extends or overrides by ID. If a preference conflicts with a rule, the preference wins.

---

## P-1 — Lint enforcement of readonly policy

**Extends:** R-TS-4, R-TS-5.

The readonly policy for contracts/main/preload is enforced by ESLint, not by convention alone. The `@typescript-eslint/prefer-readonly-parameter-types` rule runs as an `error` in `libs/contracts/eslint.config.mjs` and `apps/electron/eslint.config.mjs` (covering main and preload), configured with `ignoreInferredTypes: true` and `treatMethodsAsReadonly: true`. The electron config additionally `allow`s Electron's `BrowserWindow` and `IpcMainInvokeEvent`, which cannot be made readonly at the third-party boundary. Forgetting `readonly` on a member of these surfaces is a lint failure, not a review comment.

---

## P-2 — Task sizing is adaptive

**Extends:** R-WORK-9.

Until empirical data on CC session capacity is gathered, size tasks at roughly half of estimated session capacity. After two to three iterations, recalibrate from actuals. No hard cap on tasks per planning round — never split a single decision across rounds just to hit a count.

---

## P-3 — Cloud CC sessions open PRs

**Override of:** cloud-environment default ("do not create PRs unless asked").

Per-task CC prompts in this project carry implicit authorization to open the PR per R-WORK-14 and workflow step 7. The cloud-environment default is overridden for this repo. CC sessions should not ask permission per PR; the standing per-task prompt structure is the permission.

If a specific task should NOT open a PR (rare — exploratory branches, WIP not ready for review), the per-task prompt names it explicitly.
