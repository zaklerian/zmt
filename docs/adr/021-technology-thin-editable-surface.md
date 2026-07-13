# ADR 021 — Technology's intentionally thin editable surface

- **Status**: Accepted
- **Date**: 2026-07-13

_A deliberate scope decision recorded so the thin form does not read as an omission. It applies
the field-classification principle (ADR 018 point 5) to one entity; it introduces no new
mechanism._

## Context

A technology entity carries metadata (research cost, year, doctrine flags), tree-layout blocks
(`path` links between techs, `folder` placement with `position`), and its **actual gameplay
effect**: bonus maps keyed by unit type, equipment category, and terrain
(`<category> = { … }`, terrain modifier blocks, sub-unit bonuses). Those effect maps are nested
maps-of-maps whose legal keys are defined by the game's wider ecosystem — the unit and category
vocabularies of other files — not by the technology file alone.

A reviewer seeing the technology form edit only metadata, paths, and folders may read the
missing effect maps as an incomplete implementation.

## Decision

The technology form is **intentionally thin**: it edits metadata, `path` object-lists, `folder`
object-lists (with `position`), and reference lists — and **carries the effect bonus maps
lossless**, unedited.

This is the field-classification principle (ADR 018 point 5) applied by shape, not by omission:
a flat, open `key → scalar` map is editable ML surface (an open prop-bag), while the effect maps
are nested maps-of-maps past that structural line. They are preserved verbatim in the lossless
parsed node and round-trip through a save untouched. Editing them safely would require the
cross-entity unit/category/terrain vocabularies this layer deliberately does not have — the same
boundary that keeps every entity's ecosystem blocks out of the form.

## Consequences

**Positive**

- The thin surface is a principled boundary, not a gap: technology's editable fields are exactly
  the ones intrinsic to the file, and its effect maps are safe under the losslessness guarantee.
- No new block kind or cap change is spent on a shape (deep keyed effect maps) the intrinsic-only
  line already excludes.

**Negative / accepted**

- A technology's most gameplay-relevant content (its bonuses) is not editable in ML today; it
  remains editable in plain mode and is a candidate for the deferred cross-entity-aware surface,
  when the unit/category/terrain vocabularies become available to this layer.

## Alternatives considered

- **Model the effect maps as prop-bags.** Rejected — they are nested maps-of-maps, not flat
  `key → scalar` bags; a prop-bag would flatten structure it cannot represent and offer keys the
  file cannot validate without cross-entity context.
- **Leave the thinness unrecorded.** Rejected — without this record the form reads as an
  unfinished implementation rather than a deliberate scope boundary; the decision is exactly the
  kind a reviewer would ask "why didn't you make it fully editable?"
