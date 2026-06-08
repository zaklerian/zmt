# ZMT — Zaklerian's Modding Tool

Desktop application for managing and editing game mods. Built with Electron, React,
and TypeScript.

## Quick start

```bash
npm install
npm run dev
```

That's it — Vite, esbuild, and Electron all start in parallel with hot reload.
For more, see [Development guide](docs/DEVELOPMENT.md).

## Architecture at a glance

Three runtime contexts plus one shared library:

```
apps/electron/src/main/      Node.js — filesystem, OS, plugin runtime
apps/electron/src/preload/   privileged bridge, context-isolated
apps/zmt/                    Chromium sandbox — React UI, no Node access
libs/contracts/              shared types and IPC channel constants
```

The boundary between renderer and main is enforced at three layers: runtime
(`contextIsolation`, `sandbox`, `nodeIntegration: false`), type system (separate
tsconfigs per process, renderer has no Node types), and lint
(`@nx/enforce-module-boundaries`, `no-restricted-imports`). The renderer never imports
`electron`, `fs`, or any Node module — it talks to main exclusively through typed IPC.

For the full picture, see [Architecture](docs/ARCHITECTURE.md). For the reasoning behind
specific decisions, see [Decision records](docs/adr/).

## Project intent

ZMT is a desktop tool for managing and editing Paradox game mods. It targets two
overlapping audiences: new modders intimidated by the existing Paradox toolchain,
and experienced modders working on complex multi-feature mods where the standard
workflow (text editor + folder hand-editing + manual descriptor management) imposes
friction the tool can absorb.

The codebase reflects deliberate architectural choices documented in ADRs:
defense-in-depth on the Electron IPC security boundary, paired electron-main and
renderer libraries per game engine enforcing cross-process and cross-game
isolation, type-safe cross-process contracts, and an opinionated process framework
for AI-collaborative development.

Decisions in this codebase are bets. Not all will hold. Critique by issue or PR is
welcomed; deference is not.

## Stack

Electron 40 · React 19 · TypeScript 5.9 (strict) · Nx 22 · Vite 7 · Vitest · ESLint flat config · Husky 9 · lint-staged

## Contributing

This repository is public, but the code is proprietary (source-available, not open source). The license restricts redistribution and modification —
see [LICENCE.md](LICENCE.md). The codebase nevertheless follows conventions documented
in [CONTRIBUTING.md](docs/CONTRIBUTING.md): branch naming (`dev/ZMT-N`, `hotfix/ZMT-N`),
symbol-prefixed commit messages, and a strict three-layer architectural boundary.

## Documentation

- [Project context](docs/PROJECT.md) — what ZMT is, scope, where things live
- [Architecture](docs/ARCHITECTURE.md) — runtime topology, IPC, boundary enforcement
- [Development guide](docs/DEVELOPMENT.md) — commands, workflows, troubleshooting
- [Contributing](docs/CONTRIBUTING.md) — branches, commits, file conventions
- [Decision records](docs/adr/) — why decisions were made and what was rejected

## License

Proprietary. See [LICENCE.md](LICENCE.md).
