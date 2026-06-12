# ADR 017 — Derive module domain from equipment archetype slots

- **Status**: Accepted
- **Date**: 2026-06-12

## Context

A module's domain (air / land / naval) is currently determined by looking up the
module's `category` in a static, hand-authored table (`MODULE_CATEGORY_DOMAIN`). The
table must enumerate every category any mod might emit. In practice it is both
incomplete and partly wrong: only one domain's entries were authored against real data,
the others were guessed and do not match the category tokens present in actual game
files, so legitimate modules resolve to `unclassified`. The table also cannot follow
mod-introduced categories — each new mod requires hand-editing it, and a wrong table is
more harmful than an empty one because it presents an incorrect answer as a correct one.

Equipment archetypes already encode what the table tries to hardcode: an archetype's
`type` determines its domain, and its `module_slots` declare which categories that
archetype accepts. The domain of a category is therefore recoverable from the archetypes
whose slots reference it, across the resolved load order.

## Decision

Replace the static category-to-domain table with a domain index derived from equipment
archetypes.

1. **Derivation.** Walk equipment archetypes across the resolved load order. For each
   archetype, classify its domain from its `type` (existing equipment classification) and
   read its slots' allowed categories (existing slot extraction). Stamp the archetype's
   domain onto every category its slots accept. A category's domain is the domain of the
   archetype(s) whose slots reference it.

2. **Type-unrecognized archetypes contribute nothing.** An archetype whose `type` is not
   a recognized equipment type yields no domain and stamps no categories. A category
   reachable only through such archetypes' slots remains `unclassified`. The system
   reports an honest `unclassified` rather than inferring a domain it cannot justify.

3. **Conflicts collapse to `unclassified`.** If a category is accepted by archetype slots
   of more than one domain, it is recorded as `unclassified` rather than bound to one
   domain or to a set. Ambiguity is treated as unknown, consistent with rule 2's
   preference for an honest non-answer over a guessed one.

4. **Single shared computation.** The index is computed once as a dedicated cross-source
   pass and exposed as its own index, distinct from the per-file module read. Both
   module-domain classification and the slot designer's category-domain needs read the
   shared index; neither recomputes the archetype walk per file.

The static `category → domain` table is removed.

## Consequences

- Classification follows the archetypes actually present in the resolved workspace.
  Mod-introduced categories classify automatically once a recognized-type archetype's
  slots reference them; no per-mod table maintenance.
- No invented domains. Categories that are type-unrecognized-only or domain-ambiguous
  surface as `unclassified` rather than as a confident wrong domain.
- Module classification is no longer a per-file-local operation. A file's modules are
  classified against the workspace's archetypes, which may live in other sources;
  classifying modules in isolation from archetype data is no longer possible.
- The derived index is computed once and shared, keeping per-file module reads cheap and
  giving the slot designer a single source of category domains.

Deferred:

- A mod-extensible equipment `type` vocabulary, which would let archetypes of currently
  unrecognized types contribute to the index and close the remaining `unclassified` gap.
- A set-valued (multi-domain) category representation, should a category that legitimately
  belongs to more than one domain appear; until then ambiguity resolves to `unclassified`
  per rule 3.

## Rejected alternatives

- **Keep the static table, correct its entries.** Fixes the immediate wrong values but
  preserves per-mod hand-maintenance and the structural inability to follow mod-introduced
  categories; a future-wrong table reintroduces the same confident-wrong-answer failure.
- **Compute the domain mapping inside each per-file module read.** Avoids a separate index
  but re-walks archetypes on every file open and offers the slot designer no shared source
  for category domains.
- **Extend the type-to-domain vocabulary now so all archetypes contribute.** A second
  derivation mechanism with its own provenance question; defensible because the type
  vocabulary is small and closed per mod, but out of scope here — deferred above.
