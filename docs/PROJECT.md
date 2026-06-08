# ZMT — Project Context

This file describes the ZMT project. For working rules and code conventions, see
`.claude/BASE.md` and `.claude/PROGRAMMING.md`. For architecture rationale, see
`docs/adr/`.

## What ZMT is

Desktop tool for managing and editing Paradox game mods. Built with Electron,
React, and TypeScript.

## Scope

Multi-mod tool. Provides an ability to maintain multiple mods in a single project.

## Stack

Electron 40 · React 19 · TypeScript 5.9 strict · Nx 22 · Vite 7 · esbuild · Vitest 4 · MUI 7 · @mui/x-tree-view 8 · ESLint flat config · Husky 9 · lint-staged · GitHub Actions.

## Runtime topology

Three runtime contexts plus shared libraries. See `docs/ARCHITECTURE.md` for the full
breakdown.

| Process   | Path                         | Runtime                          |
| --------- | ---------------------------- | -------------------------------- |
| Main      | `apps/electron/src/main/`    | Node.js                          |
| Preload   | `apps/electron/src/preload/` | Privileged bridge                |
| Renderer  | `apps/zmt/`                  | Chromium sandbox                 |
| Contracts | `libs/contracts/`            | Cross-process types and channels |

## Where things live

- `apps/electron/` — main + preload (Node.js side)
- `apps/zmt/` — renderer (React + MUI)
- `libs/contracts/` — shared types and IPC channel constants
- `libs/paradox-parser/` — Paradox-script parser (cross-process)
- `libs/e-game-{gameId}/` — per-game main-side library
- `libs/r-game-{gameId}/` — per-game renderer-side library
- `docs/` — project documentation
- `docs/adr/` — architectural decisions
- `.claude/` — AI working rules (project-agnostic)
