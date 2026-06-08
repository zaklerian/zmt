# Architecture Decision Records

This folder documents architectural decisions made in ZMT. Each ADR captures _what_
was decided, _why_, and _what alternatives were considered_.

For short-form decision tracking (status + date + one-line summary), see
`docs/adr/ledger.md`.

## Format

Each ADR follows a consistent structure:

- **Status** — Accepted, Superseded by NNN, Deprecated
- **Date** — when the decision was made
- **Context** — what problem prompted the decision
- **Decision** — what was decided
- **Consequences** — positive and negative outcomes accepted with the decision
- **Alternatives considered** — what was rejected and why

## Index

| ADR | Title                                                                           | Status   |
| --- | ------------------------------------------------------------------------------- | -------- |
| 001 | [Shared contracts library](001-shared-contracts-library.md)                     | Accepted |
| 002 | [Renderer process isolation](002-renderer-process-isolation.md)                 | Accepted |
| 003 | [IPC channel constants](003-ipc-channel-constants.md)                           | Accepted |
| 004 | [Barrel exports as passive aggregation](004-barrel-exports-and-naming.md)       | Accepted |
| 005 | [File naming and suffix conventions](005-file-naming-and-suffix-conventions.md) | Accepted |
| 006 | [Branching and commit conventions](006-branching-and-commit-conventions.md)     | Accepted |
| 007 | [File classification model](007-file-classification.md)                         | Accepted |
| 008 | [IPC error model](008-ipc-error-model.md)                                       | Accepted |
| 009 | [Library taxonomy and extraction rule](009-library-taxonomy.md)                 | Accepted |
| 010 | [Paired-library architecture per game](010-plugin-architecture.md)              | Accepted |
| 011 | [Form library: React Hook Form + Zod](011-form-library.md)                      | Accepted |
| 012 | [Code editor: CodeMirror 6](012-editor-choice.md)                               | Accepted |
| 013 | [Multi-mod workspace model](013-multi-mod-workspace-model.md)                   | Accepted |

## When to write an ADR

Write an ADR when a decision:

- Has more than one defensible answer
- Affects multiple parts of the codebase
- Future engineers might want to reverse or revisit
- A reviewer might ask "why didn't you do it the other way?"

Don't write an ADR for:

- Single-line code conventions (CONTRIBUTING.md or ESLint rules)
- Decisions with one obvious right answer
- Implementation details that don't shape the architecture
- Process changes (those go in `ledger.md` and PREFERENCES.md)
