# ADR 017 — Derive equipment domain from interface category

## Status

Accepted

## Date

2026-06-12

## Context

An equipment archetype's domain (air / land / naval) is currently determined by looking
up its `type` field in a static table (EQUIPMENT*TYPE_DOMAIN). The `type` field's real
purpose is to identify the equipment \_kind* — it drives buildable variant grouping,
`allowed_types`, and `type_override` — and domain classification was layered onto it as a
second responsibility. The static table enumerates which type tokens belong to which
domain, and like every hand-authored domain table in this project it has drifted: it was
populated against one total-conversion mod's renamed type vocabulary and does not contain
the base-game type tokens. Vanilla equipment therefore fails to classify (its types are
absent from the table).

The data already carries a field whose purpose is domain-aligned grouping:
`interface_category`, present on equipment archetypes, drives the air-designer interface
categorization. Its observed values across the base game are a small, closed set that maps
cleanly onto the three domains:

    interface_category_air            air
    interface_category_armor          land
    interface_category_land           land
    interface_category_capital_ships  naval
    interface_category_other_ships    naval
    interface_category_screen_ships   naval

`interface_category` is finer-grained than domain — it is a UI grouping, so several of its
values collapse to a single domain — but it is an existing, authored, domain-aligned field
rather than a classification invented or maintained separately from the game data.

## Decision

Derive equipment domain from `interface_category` via an explicit mapping; remove the
`type`-based domain table.

1. **Source field.** Equipment domain is determined by the archetype's `interface_category`
   value, looked up in an explicit `interface_category → domain` table containing exactly
   the entries above. `type` retains its existing responsibilities (equipment kind,
   variant grouping, allowed types, type override) and no longer participates in domain
   classification.

2. **Explicit entries, not pattern matching.** The mapping is a literal enumeration of
   known `interface_category` values. Domain is not inferred from substrings or suffixes
   of the value (e.g. a `*_ships → naval` pattern is not used). A new `interface_category`
   value is classified only once it is added to the table deliberately.

3. **Unrecognized category does not resolve.** An archetype whose `interface_category` is
   absent, or whose value is not in the table, yields no domain and classifies as
   invalid. An archetype is a resolution target, not a reference holder, so the
   classification model's `unresolved` state — which carries the dangling archetype
   reference of a variant — does not apply to it; a structurally valid archetype with no
   determinable domain is invalid. The system reports a non-classification rather than
   inferring a domain it cannot justify.

4. **Variants inherit via archetype.** Domain is read from the archetype; buildable
   variants that reference an archetype derive their domain through it and are not required
   to carry their own `interface_category`.

The `type → domain` table (EQUIPMENT_TYPE_DOMAIN) is removed.

## Consequences

- Base-game equipment classifies, because `interface_category` is authored on base-game
  archetypes.
- Domain classification no longer depends on maintaining a domain table keyed on the
  type-kind vocabulary, which each mod renames. The `interface_category` set is small,
  stable, and shared across base game and mods that build on its interface, so it drifts
  far less; when it does, a single explicit entry is added.
- `type` carries a single responsibility (equipment kind) rather than kind plus domain.
- The classification mapping remains a hand-maintained table — smaller and more stable
  than the one removed, but not derivation-free. A mod that introduces a genuinely new
  `interface_category` requires an entry before its equipment classifies; until added,
  that equipment is unresolved rather than misclassified.

Deferred:

- Variant→archetype domain inheritance (rule 4) lands as a follow-up. The equipment
  extractor is pure over a single parsed block and does not perform the cross-entity
  archetype lookup a variant's domain requires; until that step ships, a variant carrying
  no `interface_category` of its own does not classify.
- Reading `interface_category → domain` from mod-provided interface definitions to remove
  the last hand-maintained mapping entirely; out of scope, and lower value than the
  type-table removal because this set is stable.

## Rejected alternatives

- **Patch EQUIPMENT_TYPE_DOMAIN with the missing base-game type tokens.** Restores vanilla
  classification but keeps domain overloaded onto `type` and preserves a table keyed on the
  most volatile, per-mod-renamed vocabulary in the data — the drift that caused this defect
  recurs on the next mod or base-game addition.
- **Infer domain from `interface_category` value patterns (suffix/substring).** Avoids
  enumerating the naval buckets but encodes a classification rule the data does not state;
  a future `interface_category` value matching the pattern is auto-classified with no
  evidence, reintroducing invented classification.
- **Add a dedicated domain field to the parsed equipment model, populated by heuristics.**
  Invents an axis the game data does not contain, rather than projecting one it does.
