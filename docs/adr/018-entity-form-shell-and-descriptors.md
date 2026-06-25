# ADR 018 — Entity editing via a generic form shell and per-entity form descriptors

- **Status**: Accepted
- **Date**: 2026-06-15

## Update (2026-06-16) — extended at the CHARACTER deep-dive

This ADR is extended (not superseded) by the first task-2 entity. Three changes, plus a
correction to the expansion principle:

- **Point 3 — block composition.** The named nested block gains an optional
  list-of-scalars child: a named child may hold its key→scalar rows AND a list-of-scalars
  child. No fixed-fields facet is added — a role's scalars ride the existing known-key
  rows, since editing operates on existing files (keys-when-present), so always-shown
  labelled fields are not required. One additional bounded level of nesting is admitted:
  a named block → named child → scalar leaves (e.g. `portraits -> army -> large`). Recursion
  is still rejected; the cap is two levels, and anything deeper stays in the lossless node
  for plain mode.

- **Point 4 — validation vocabulary.** The vocabulary gains `enum`: a closed set of
  allowed values for a single field, lowering to `z.enum([...])` and rendered as a closed
  select that rejects values outside the set. This is distinct from the property bag's
  known-key set, which is an open suggestion list permitting free-text; `enum` is closed.
  It applies only to intrinsic closed value sets (e.g. character `gender`); cross-entity
  value sets remain free-text per the intrinsic/relational line. A boolean field uses
  `type` (rendered as a yes/no select), not `enum`.

- **Expansion principle — corrected.** Point 4 originally gated vocabulary growth on "a
  real third case (R-WORK-7)." That borrowed the post-hoc extraction heuristic — R-WORK-7
  and A-PROJ-1 govern extracting already-duplicated code, where waiting buys
  variation-and-shape discovery — and applied it to a forward, design-time decision where
  it does not fit. A keyword is admitted when the need recurs by design AND its shape is
  known and stable; `enum` meets both, so it is not speculative. Keywords whose shape is
  genuinely uncertain — arbitrary predicates, cross-field rules — remain out of scope, and
  that exclusion stands on shape-uncertainty, not on a count.

The original decision text below is retained as the record.

## Update (2026-06-16, TECHNOLOGY) — object-list block

Point 3 deferred "repeated object blocks … designed against a concrete consumer when one
requires them." TECHNOLOGY is that consumer (`path`, `folder`), so the object-list block
lands:

- **Object-list block.** A list of repeated same-named blocks (e.g. `path`), items
  positional. Each item is a set of scalar field-specs, optionally plus ONE nested
  named-object (e.g. `folder`'s `position { x y }`) within the two-level nesting cap — no
  deeper. The block renders as repeatable item cards.
- **Item add/remove.** Adding or removing a list item inserts or deletes one rendered
  block. This is block-level editing within an existing entity; it is distinct from entity
  create/insert (creating a whole new named entity), which stays deferred. The form layer
  binds items by position; the write addresses them by the indexed scope segment (ADR 019,
  as amended the same date).
- **Intrinsic line holds.** Item values defined by other entities (`leads_to_tech`,
  `folder`'s `name`) are free-text; local scalars (`research_cost_coeff`, `position` x/y)
  use the validation vocabulary. Item sub-blocks the descriptor does not model are carried
  verbatim through a save, as elsewhere.
- **Keyed object-maps remain deferred.** The other shape point 3 deferred (a map of
  variable keys to object values) is not built here; it is designed against its own
  concrete consumer when one requires it.

A descriptor reaches an object-list through the indexed scope; the shell and resolver are
otherwise unchanged. Adding an object-list-bearing entity stays "register a descriptor."

## Update (2026-06-18, IDEOLOGY) — keyed-object-map editing (editable variable-key `namedChildren`)

This lands the "keyed object-maps" shape ADR-018 had deferred.

### Context

The named-nested block's `namedChildren` facet already models a key→object map — a variable
key naming a child block of scalar fields — and is populated data-driven from the file. But
it rendered read-only: no affordance to add, remove, or rename an entry, and no key input.
The last unbuilt ML shape was therefore not a new value type but the EDITING of this map.
The motivating entity is IDEOLOGY, whose `types = { <subideology> = { … } }` is a variable-key
map of objects the modder adds to and removes from.

### Decision

`namedChildren` gains an OPT-IN editable keyed-map mode, expressed as a flag on the
named-nested block carrying an add label and the per-entry field template. When the flag is
present the renderer shows an add affordance, a per-entry remove, and an editable key field,
and seeds a new entry from the template; the key model is the freeSolo variable key already
used by the scalar maps, now over an object value. When the flag is absent the facet behaves
exactly as before — a read-only data-driven set — so the existing consumer (character
portraits) is unchanged.

Write semantics reuse the existing scoped-delta path: an entry is added or removed by a delta
scoped to the map block keyed by the entry id, and its scalars are written one level deeper.
A bodyless add materializes an empty `<key> = { }` block (vanilla map entries are frequently
empty). **Renaming a key is remove-old + add-new**, not a key-mutation primitive — the write
path has none and needs none. Keys of an entry that are not in the field template are carried
lossless.

The two-level nesting cap is unchanged. A value nested below an entry's scalars (e.g. a
subideology's optional `color = { r g b }` block, a third level) is NOT modeled; it is carried
lossless like any ecosystem block.

### Consequences

**Positive**

- The keyed-object map — the shape ADR-018 deferred — is now editable, reusing the proven
  key→object model and the existing write path rather than a new block kind.
- The mode is opt-in, so no existing `namedChildren` consumer changes behavior.

**Negative / accepted**

- A value below an entry's scalar fields is not editable in ML (it exceeds the two-level
  cap and is carried lossless). For IDEOLOGY this means subideology `color` is preserved but
  not edited; RGB editing is a richer (color-picker) concern left to a later layer.

### Alternatives considered

- **A new `keyedObjectListBlock`** (keyed analogue of the object-list block). Rejected — it
  duplicates the key→object model the `namedChildren` facet already carries; the smaller change
  is to add the editing affordances to that facet.
- **Extend the entry value to host a nested block** (lift the cap to three levels to edit
  subideology `color`). Rejected — it breaches the two-level cap for a rare optional RGB
  triple that wants a color picker, not a generic nested-block editor.

## Update (2026-06-25, IDEOLOGY) — keyed-object-map entry value may be a prop-bag

### Context

The keyed-object-map editing amendment modeled each entry's value as a fixed-field template —
a set of declared scalar specs. Real mod data showed entry values that are open scalar maps:
ideology subideologies are open maps of modifier scalars (`political_power_factor = 0.075`, …),
and state per-province buildings are open maps of building → level. A fixed template cannot
represent these — it renders declared fields the data does not have and hides the open keys it
does. (The earlier amendment's ideology example, `can_be_randomly_selected`, was grounded in
vanilla, not real data; that key does not occur in the real subideologies.)

### Decision

A keyed-object-map entry's value may be EITHER a fixed-field template OR a **prop-bag** (open
or known keys), chosen per descriptor. A prop-bag entry reuses the existing property-bag
rendering — freeSolo keys, scalar values, add/remove — one level under the entry key. The
fixed-template mode is retained for entries with a known, closed field set.

The two-level nesting cap is unchanged: the entry's prop-bag is the entry value (the second
level), not a third — so this needs no cap change.

### Consequences

- One capability serves both ideology subideology (open modifier maps) and state per-province
  buildings (province → building maps); the keyed-object-map generalizes from
  fixed-template-only to template-or-prop-bag.
- Corrects the original amendment's implicit assumption that entry values are always a fixed
  field set.

### Alternatives considered

- **Keep fixed-template only and carry the open maps lossless.** Rejected — it leaves
  subideologies with no editable content (the form shows a key and nothing else) and hides the
  per-province building data entirely.
- **A distinct keyed-map-of-objects block + a two-level-cap lift for the deeper case.**
  Rejected — the entry values are flat prop-bags, so one prop-bag entry-value variant covers
  both consumers at the existing depth; a separate block and a cap lift would be redundant
  machinery.

## Context

Entity _lists_ render through a game-agnostic table shell driven by per-(game, entity) recognizers (shipped in S-1; no standalone ADR — code only). Entity _editing_ exists only as bespoke forms — the mod-descriptor form, the equipment/plane scalar form, and the module form — each hand-wired. As editable types multiply, hand-wiring duplicates the cross-cutting form concerns (field rendering, validation, dirty-tracking, write dispatch) and lets them drift.

A second constraint bounds scope. Entities routinely embed large shared sub-vocabularies — boolean condition blocks, command/effect blocks, stat-modifier blocks — whose legal contents are defined by the game's wider ecosystem and by relationships to other entities, not by the file being edited. Those values cannot be determined from the open file alone, so editing them safely needs cross-entity context this layer does not have.

## Decision

1. **Generic form shell.** An entity-agnostic form shell owns the cross-cutting form concerns (field rendering, dirty-tracking, validation wiring, save dispatch) and carries no entity-specific knowledge. It is the host's form infrastructure, consistent with the host/per-game split of ADR 010 and built on the React Hook Form + Zod foundation of ADR 011. The shell's RHF resolver accepts either a descriptor-generated Zod schema or an externally-supplied Zod schema; the field-specification path (point 4) produces the former, and a descriptor may instead hand the shell a complete schema for the latter.

2. **Per-entity form-descriptor registry, separate from the recognizer registry.** A per-(game, entity) form-descriptor registry drives the shell, kept separate from the read-side recognizer registry. Read and write evolve independently — a type may be listable without being editable — and a shared entity-identifier constant prevents the two registries from drifting. Descriptors are code modules composing shared form blocks, exactly as recognizers are code modules, not a runtime-interpreted schema. The shell and registry are host-side; concrete descriptors are owned by the per-game `r-game-{x}` library that owns that game's entity UI (ADR 010).

3. **Three form blocks.** Scalar/property bag (flat key->value rows; keys optionally drawn from a curated known set with free-text entry); named nested block (one level deep, no recursion); list of scalar values. Each block pairs its render shape with its write scope — root scope or a named child block — matching the scoped-delta write contract of ADR 019; a key->scalar map reuses the property-bag block rather than introducing a new one. Repeated object blocks and keyed object-maps are out of scope and deferred — designed against a concrete consumer when one requires them, not speculatively. _(Extended 2026-06-16 — see Update.)_

4. **Field specification.** A field, and each member of a known set, is specified as either a bare name or an object carrying the name plus optional validation: `string | { name, validation? }` — the same shape for fixed fields and for property-bag members. `validation` is a small closed structural vocabulary (required, type, bounds, pattern) that lowers to a generated Zod schema feeding the shell's RHF resolver (ADR 011). It is deliberately not a general validation language; arbitrary predicates and cross-field rules are out of scope. `required` means a value must be non-empty when its key is present; it does not assert the key must exist, because editing operates on existing files that legitimately omit optional keys. _(Extended 2026-06-16 — `enum` added; expansion principle corrected; see Update.)_

5. **Intrinsic-only surface.** A form edits only the fields whose meaning is intrinsic to the open file. A field whose known set is intrinsic to the file is offered as that set plus free-text; a field whose legal values are defined by other entities is plain free-text input, since the open file cannot enumerate them. The shared ecosystem sub-vocabularies (condition/effect/modifier blocks) are never rendered or rewritten — they are preserved verbatim in the lossless parsed node and carried through a save untouched (R-CODE-5). Cross-entity-aware editing of those blocks is deferred.

## Consequences

**Positive**

- Adding an editable entity becomes registering a descriptor that composes existing blocks — no shell change. Open for extension, closed for modification.
- The intrinsic-only line keeps the layer honest about what one file can know and isolates the cross-entity problem for later. Entities dominated by ecosystem blocks expose only a thin scalar surface here; the rest stays editable in plain mode and in the deferred cross-entity surface.
- Known sets curated statically in descriptors give serializable, inspectable specs; a future centralized source for modder-defined keys (the deferred custom-variable manager) would replace that curation, with per-field free-text covering invented keys until then.

**Negative / accepted**

- The bespoke mod-descriptor, plane, and module forms migrate onto the shell in one change; a single consumer would leave the abstraction unproven, so all three migrate together and the blocks are proven across them. The shell is app-shared infrastructure under `apps/zmt/src/shared/` (A-PROJ-4), not a library — A-PROJ-1's library-extraction gate does not govern it; "prove the abstraction across the three concrete forms before trusting it" is the bar, not a third-library-consumer count.
- **Schema-sourcing reconciliation — resolved.** ADR 011 names per-feature hand-written Zod schemas as future work, and the mod-descriptor form validates via ADR 010's `modDescriptorSchemaExtension` through `resolveSchemaForPlugin` -> `baseModDescriptorSchema.extend` -> `zodResolver`. That is a second schema-sourcing path alongside this ADR's descriptor-generated Zod. Resolution: the shell's resolver accepts both. Module and plane descriptors use the generated path; the mod-descriptor form supplies its own schema via the existing plugin-extension path; ADR 011's deferred per-feature hand-written schemas use the same externally-supplied input when they arrive. The closed validation vocabulary is therefore not stretched to subsume `baseModDescriptorSchema` — the two paths coexist rather than one absorbing the other.
- The closed validation vocabulary will feel limiting — intended. It buys serializable specs and avoids a second validation framework shadowing Zod.
- Deferring object-list and object-map blocks leaves some entity surfaces not-yet-fully-editable; those entities surface the concrete block shape needed before it is built.

## Alternatives considered

- **Keep bespoke per-entity forms.** Rejected — duplicates the cross-cutting concerns once per entity and drifts as types multiply; the recurrence is the motivation.
- **A runtime-interpreted declarative schema -> form engine** (field-type interpreters, conditional-field DSL, nested-schema recursion). Rejected — that is a framework abstracted from three forms, and it duplicates Zod's job. Descriptors-as-code composing fixed blocks is the bounded form of the same idea.
- **One unified entity descriptor carrying both read (columns) and write (form) metadata.** Rejected — couples the read and write lifecycles and forces a form slot onto listable-but-not-editable types. Two registries with a shared id constant keep them independent without drift.
- **Force the mod-descriptor schema onto the closed validation vocabulary** (one path absorbs the other). Rejected — either loses validation fidelity the hand-written schema carries or bloats the closed vocab to swallow `baseModDescriptorSchema`, defeating its deliberate limit. Accepting both schema sources is cheaper and keeps each path honest.
- **Render the ecosystem blocks (conditions/effects/modifiers) in the form.** Rejected — their legal contents are cross-entity/ecosystem, unknowable from the open file; rendering them here would invent affordances the layer cannot back. They stay verbatim in the lossless node.
