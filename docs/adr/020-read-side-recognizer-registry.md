# ADR 020 — Read-side recognizer registry

- **Status**: Accepted
- **Date**: 2026-07-13

_Retroactive record. The recognizer registry shipped as code during the initial
entity-listing work without a standalone ADR; the paired form-descriptor registry (ADR 018)
later documented its own decision and referenced this read side as its unrecorded sibling.
This ADR captures the shipped design in durable terms. It introduces no new decision._

## Context

A mod is a tree of plain-text script files with no manifest saying which file holds which
kind of entity — a `common/units/equipment/modules/*.txt` file holds modules, a `history/states/*`
file holds a state, and so on, determined by path and content convention. To render an entity
as a typed table, the renderer must answer two questions for an open file: **which entity does
this file hold**, and **how is it read into table rows**. Both answers are game-specific: only
the game's library knows hoi4's file conventions and entity shapes.

Hardcoding a file→entity dispatch in the host would pull game-specific path conventions into
host code, violating the host/per-game separation (ADR 010). The mapping must live with the
game, and the host must discover it without knowing any entity by name.

## Decision

Recognize and load entities through a per-(game, entity) **recognizer** resolved by a host-side
registry.

- **The recognizer.** Each entity a game can list contributes an `EntityTableRecognizer`
  exposing `matches(filePath)` — does this file hold this entity? — and
  `load(filePath, translate)` — read it into the game-agnostic `EntityTableData` (columns, rows,
  default sort, toolbar actions). A recognizer is a code module owned by the game's
  renderer-side library, exactly as a form descriptor is (ADR 018); it is not a
  runtime-interpreted schema.

- **The registry.** A host-side registry holds the registered recognizers and resolves an open
  file to the **first** recognizer whose `matches` returns true. The host asks the registry, not
  a switch over entity kinds — adding a listable entity is registering a recognizer, not editing
  host dispatch. Recognizers register per game through the game's renderer plugin (ADR 010),
  alongside its form descriptors and locale resources.

- **The shared entity-identifier constant.** A recognizer's `id` and its paired form
  descriptor's `entityId` are one shared constant per entity (e.g. a single `hoi4-module`
  identifier imported by both). This is the only coupling between the read-side recognizer
  registry and the write-side form-descriptor registry.

- **`load` bridges to the read services.** A recognizer's `load` calls the entity's read IPC
  channel, whose main handler delegates to a main-side read service and the game's extraction
  utility, which build the typed projection `load` maps into rows. The recognizer owns the
  renderer-side read contract; the main side owns parsing and extraction.

## Relationship to the write side (ADR 018)

The recognizer registry (read) and the form-descriptor registry (write) are deliberately
**separate registries that share only the entity-identifier constant**. Read and write evolve
independently: a type may be listable (recognizer only) without being editable (no descriptor).
The shared constant keeps the two keyed identically so they cannot drift while staying
decoupled. ADR 018 records the write-side half of this pairing and its reasoning for keeping
the two registries separate rather than fusing them into one entity descriptor; this ADR
records the read-side half that predated it.

## Consequences

**Positive**

- Game-specific file conventions and entity shapes stay in the game's library; the host
  discovers entities without naming any (ADR 010 upheld on the read path).
- Adding a listable entity is registering a recognizer — open for extension, closed for
  modification, symmetric with adding an editable entity (ADR 018).
- The read and write lifecycles are independent, so a listable-but-not-editable type carries no
  empty form slot and an editable type reuses the same identifier on both sides.

**Negative / accepted**

- First-match resolution means recognizer registration order is significant when two
  recognizers' `matches` predicates could both accept a file; predicates are written to be
  mutually exclusive by path convention, and the ordering is an accepted, low-cost constraint
  rather than a scored best-match.

## Alternatives considered

- **A host-side file→entity switch.** Rejected — it pulls game-specific path conventions into
  host code and grows with every entity, the exact coupling ADR 010 exists to prevent.
- **One unified entity descriptor carrying both read (columns) and write (form) metadata.**
  Rejected for the same reason ADR 018 rejected it — it couples the read and write lifecycles
  and forces a form slot onto listable-but-not-editable types. Two registries sharing one id
  constant keep them independent without drift.
- **A runtime-interpreted recognition schema.** Rejected — recognition needs arbitrary
  path/content predicates; a code module expresses them directly, consistent with descriptors
  being code, not interpreted data.
