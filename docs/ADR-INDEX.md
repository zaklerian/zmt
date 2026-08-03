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

| ADR | Title                                                                                                         | Status   |
| --- | ------------------------------------------------------------------------------------------------------------- | -------- |
| 001 | [Shared contracts library](adr/001-shared-contracts-library.md)                                               | Accepted |
| 002 | [Renderer process isolation](adr/002-renderer-process-isolation.md)                                           | Accepted |
| 003 | [IPC channel constants](adr/003-ipc-channel-constants.md)                                                     | Accepted |
| 004 | [Barrel exports as passive aggregation](adr/004-barrel-exports-and-naming.md)                                 | Accepted |
| 005 | [File naming and suffix conventions](adr/005-file-naming-and-suffix-conventions.md)                           | Accepted |
| 006 | [Branching and commit conventions](adr/006-branching-and-commit-conventions.md)                               | Accepted |
| 007 | [File classification model](adr/007-file-classification.md)                                                   | Accepted |
| 008 | [IPC error model](adr/008-ipc-error-model.md)                                                                 | Accepted |
| 009 | [Library taxonomy and extraction rule](adr/009-library-taxonomy.md)                                           | Accepted |
| 010 | [Paired-library architecture per game](adr/010-plugin-architecture.md)                                        | Accepted |
| 011 | [Form library: React Hook Form + Zod](adr/011-form-library.md)                                                | Accepted |
| 012 | [Code editor: CodeMirror 6](adr/012-editor-choice.md)                                                         | Accepted |
| 013 | [Multi-mod workspace model](adr/013-multi-mod-workspace-model.md)                                             | Accepted |
| 014 | [Reference / read-only sources](adr/014-reference-readonly-sources.md)                                        | Accepted |
| 015 | [Business actions: availability-driven interaction pattern](adr/015-business-actions.md)                      | Accepted |
| 016 | [Load-order file resolution and provenance](adr/016-load-order-resolution.md)                                 | Accepted |
| 017 | [Derive equipment domain from interface category](adr/017-derive-equipment-domain-from-interface-category.md) | Accepted |
| 018 | [Entity form shell and per-entity descriptors](adr/018-entity-form-shell-and-descriptors.md)                  | Accepted |
| 019 | [Atomic batched scoped deltas for entity writes](adr/019-atomic-batched-entity-writes.md)                     | Accepted |
| 020 | [Read-side recognizer registry](adr/020-read-side-recognizer-registry.md)                                     | Accepted |
| 021 | [Technology's intentionally thin editable surface](adr/021-technology-thin-editable-surface.md)               | Accepted |
| 022 | [Paradox `@` substitution-symbol model](adr/022-paradox-symbol-model.md)                                      | Accepted |
| 023 | [Data-grounding harness and coverage baseline](adr/023-data-grounding-harness.md)                             | Accepted |
| 024 | [Source-scoped entity read layer](adr/024-source-scoped-read-layer.md)                                        | Accepted |
| 025 | [Tech-tree geometry from the tree-view `.gui`](adr/025-tech-tree-geometry.md)                                 | Accepted |

## Amendments

Several ADRs were extended in place as entity editing and the data-grounding reconciliation
matured. The amendments live in the ADR files (dated update sections); this table makes them
discoverable from the index.

| ADR | Amendment                                                                               |
| --- | --------------------------------------------------------------------------------------- |
| 018 | Object-list block (repeated same-named object blocks, e.g. `path` / `folder`)           |
| 018 | List-of-scalars child, one bounded second nesting level, and the closed `enum` keyword  |
| 018 | Keyed-object-map editing (editable variable-key `<key> = { … }` object maps)            |
| 018 | Keyed-object-map entry value may be a prop-bag (open `key → scalar` entries)            |
| 019 | Grandchild scope — the write scope widens to an ordered path of block names             |
| 019 | Positional addressing of repeated same-name blocks (the indexed scope segment)          |
| 019 | Materializing absent intermediate blocks for added-only deltas                          |
| 019 | Numeric assignment keys in the parser grammar (unquoted province-id keys)               |
| 019 | Batch-coordinated (coalesced) intermediate materialization                              |
| 024 | Resolution is two-stage: file resolution (stage 1) then entity-name last-wins (stage 2) |

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
