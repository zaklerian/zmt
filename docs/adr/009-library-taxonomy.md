# ADR 009 — Library taxonomy and extraction rule

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

The project is one Nx monorepo with multiple apps and several shared libraries. The
library count grows as features land. Two problems must be solved before more
libraries appear:

1. **Naming.** Without a convention, libraries accumulate inconsistent names. A
   library called `tree` could be a UI primitive, a feature, or a parsing utility.
2. **When to create them.** Premature extraction creates abstractions that bend to fit
   the first consumer; later consumers fight them. Late extraction creates duplication
   that's expensive to consolidate.

## Decision

### Taxonomy — prefix encodes runtime, suffix encodes role

| Prefix | Runtime                          |
| ------ | -------------------------------- |
| `r-`   | renderer (frontend)              |
| `e-`   | electron-main                    |
| none   | cross-process (e.g. `contracts`) |

| Suffix         | Role                                           |
| -------------- | ---------------------------------------------- |
| `-core`        | composition glue (routing, state stores, etc.) |
| `-ui`          | UI primitives                                  |
| `-feature-{x}` | feature module                                 |
| `-game-{x}`    | game-specific paired library                   |

Examples currently in the workspace:

- `contracts` — cross-process types
- `paradox-parser` — cross-process parser
- `e-game-hoi4` — HOI4 main-side library
- `r-game-hoi4` — HOI4 renderer-side library

Future names that would fit:

- `r-ui` — shared frontend UI primitives
- `r-core` — frontend composition (routing, top-level providers)
- `r-feature-mod-content` — renderer feature module

### When to create — rule of three (precondition + criteria)

Codified as A-PROJ-1 in `.claude/PROGRAMMING.md`:

Create a library only when **a third concrete consumer exists or is in active
development**. This is the precondition gate. If it fails, stop.

If the precondition is met, verify all three:

1. **Stable surface.** The component's API has survived at least one real feature
   without prop additions or signature changes.
2. **Domain-free core.** No knowledge of any specific feature's data shape, error
   model, or transport. If it imports from `@contracts` or `window.api`, it isn't
   a primitive.
3. **Style worth sharing.** Visual or interaction conventions deliberately enforced
   across consumers.

If any fails, keep in feature. Revisit on the next consumer.

The folder hierarchy reflects this:

- A library exists only if extraction has been earned
- Until then, code lives in the consuming app under `features/{name}/`
- Empty placeholder folders (`shared/`, `ui/`, etc.) are not created in anticipation

## Consequences

**Positive**

- Library names communicate scope and role at a glance
- The rule of three prevents premature abstraction
- The taxonomy scales — adding `e-cli`, `r-test-helpers`, etc. fits naturally
- Library boundaries become a real architectural concern, not just file organization

**Negative**

- The first/second consumer experiences duplication before extraction. This is
  the trade-off: cheap duplication now vs. wrong abstraction later.
- The rule of three needs review-side enforcement; nothing technical prevents
  extracting after two consumers. A reviewer comment is the gate.

## Alternatives considered

- **No naming convention; libraries named by role only** — rejected. After three
  or four libraries it stops being obvious which runtime each belongs to.
- **Folder-prefixed by domain instead of runtime** — rejected. Runtime is the more
  important boundary because it governs allowed dependencies (renderer can't depend
  on main, etc.). Naming by domain hides this.
- **Extract on rule of two** — rejected. The trade-off is between premature
  extraction (rule of two) and duplication cost (rule of three). For a project at
  this scale, the cost of wrong abstraction is higher than the cost of one extra
  duplicated component.
- **Extract on rule of one (build the lib first)** — rejected outright.
  Pre-emptive libraries are the textbook over-engineering pattern.

ADR 010 specifies the paired-library architecture per game that exercises this
taxonomy on the `-game-{x}` suffix.
