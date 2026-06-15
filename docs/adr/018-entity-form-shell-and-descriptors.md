# ADR 018 — Entity editing via a generic form shell and per-entity form descriptors

- **Status**: Accepted
- **Date**: 2026-06-15

## Context

Entity _lists_ render through a game-agnostic table shell driven by per-(game, entity) recognizers (shipped in S-1; no standalone ADR — code only). Entity _editing_ exists only as bespoke forms — the mod-descriptor form, the equipment/plane scalar form, and the module form — each hand-wired. As editable types multiply, hand-wiring duplicates the cross-cutting form concerns (field rendering, validation, dirty-tracking, write dispatch) and lets them drift.

A second constraint bounds scope. Entities routinely embed large shared sub-vocabularies — boolean condition blocks, command/effect blocks, stat-modifier blocks — whose legal contents are defined by the game's wider ecosystem and by relationships to other entities, not by the file being edited. Those values cannot be determined from the open file alone, so editing them safely needs cross-entity context this layer does not have.

## Decision

1. **Generic form shell.** An entity-agnostic form shell owns the cross-cutting form concerns (field rendering, dirty-tracking, validation wiring, save dispatch) and carries no entity-specific knowledge. It is the host's form infrastructure, consistent with the host/per-game split of ADR 010 and built on the React Hook Form + Zod foundation of ADR 011. The shell's RHF resolver accepts either a descriptor-generated Zod schema or an externally-supplied Zod schema; the field-specification path (point 4) produces the former, and a descriptor may instead hand the shell a complete schema for the latter.

2. **Per-entity form-descriptor registry, separate from the recognizer registry.** A per-(game, entity) form-descriptor registry drives the shell, kept separate from the read-side recognizer registry. Read and write evolve independently — a type may be listable without being editable — and a shared entity-identifier constant prevents the two registries from drifting. Descriptors are code modules composing shared form blocks, exactly as recognizers are code modules, not a runtime-interpreted schema. The shell and registry are host-side; concrete descriptors are owned by the per-game `r-game-{x}` library that owns that game's entity UI (ADR 010).

3. **Three form blocks.** Scalar/property bag (flat key→value rows; keys optionally drawn from a curated known set with free-text entry); named nested block (one level deep, no recursion); list of scalar values. Each block pairs its render shape with its write scope — root scope or a named child block — matching the scoped-delta write contract of ADR 019; a key→scalar map reuses the property-bag block rather than introducing a new one. Repeated object blocks and keyed object-maps are out of scope and deferred — designed against a concrete consumer when one requires them, not speculatively.

4. **Field specification.** A field, and each member of a known set, is specified as either a bare name or an object carrying the name plus optional validation: `string | { name, validation? }` — the same shape for fixed fields and for property-bag members. `validation` is a small closed structural vocabulary (required, type, bounds, pattern) that lowers to a generated Zod schema feeding the shell's RHF resolver (ADR 011). It is deliberately not a general validation language; arbitrary predicates and cross-field rules are out of scope. `required` means a value must be non-empty when its key is present; it does not assert the key must exist, because editing operates on existing files that legitimately omit optional keys. The vocabulary expands only when a real third case demands it (R-WORK-7).

5. **Intrinsic-only surface.** A form edits only the fields whose meaning is intrinsic to the open file. A field whose known set is intrinsic to the file is offered as that set plus free-text; a field whose legal values are defined by other entities is plain free-text input, since the open file cannot enumerate them. The shared ecosystem sub-vocabularies (condition/effect/modifier blocks) are never rendered or rewritten — they are preserved verbatim in the lossless parsed node and carried through a save untouched (R-CODE-5). Cross-entity-aware editing of those blocks is deferred.

## Consequences

**Positive**

- Adding an editable entity becomes registering a descriptor that composes existing blocks — no shell change. Open for extension, closed for modification.
- The intrinsic-only line keeps the layer honest about what one file can know and isolates the cross-entity problem for later. Entities dominated by ecosystem blocks expose only a thin scalar surface here; the rest stays editable in plain mode and in the deferred cross-entity surface.
- Known sets curated statically in descriptors give serializable, inspectable specs; a future centralized source for modder-defined keys (the deferred custom-variable manager) would replace that curation, with per-field free-text covering invented keys until then.

**Negative / accepted**

- The bespoke mod-descriptor, plane, and module forms migrate onto the shell in one change; a single consumer would leave the abstraction unproven, so all three migrate together and the blocks are proven across them. The shell is app-shared infrastructure under `apps/zmt/src/shared/` (A-PROJ-4), not a library — A-PROJ-1's library-extraction gate does not govern it; "prove the abstraction across the three concrete forms before trusting it" is the bar, not a third-library-consumer count.
- **Schema-sourcing reconciliation — resolved.** ADR 011 names per-feature hand-written Zod schemas as future work, and the mod-descriptor form validates via ADR 010's `modDescriptorSchemaExtension` through `resolveSchemaForPlugin` → `baseModDescriptorSchema.extend` → `zodResolver`. That is a second schema-sourcing path alongside this ADR's descriptor-generated Zod. Resolution: the shell's resolver accepts both. Module and plane descriptors use the generated path; the mod-descriptor form supplies its own schema via the existing plugin-extension path; ADR 011's deferred per-feature hand-written schemas use the same externally-supplied input when they arrive. The closed validation vocabulary is therefore not stretched to subsume `baseModDescriptorSchema` — the two paths coexist rather than one absorbing the other.
- The closed validation vocabulary will feel limiting — intended. It buys serializable specs and avoids a second validation framework shadowing Zod.
- Deferring object-list and object-map blocks leaves some entity surfaces not-yet-fully-editable; those entities surface the concrete block shape needed before it is built.

## Alternatives considered

- **Keep bespoke per-entity forms.** Rejected — duplicates the cross-cutting concerns once per entity and drifts as types multiply; the recurrence is the motivation.
- **A runtime-interpreted declarative schema → form engine** (field-type interpreters, conditional-field DSL, nested-schema recursion). Rejected — that is a framework abstracted from three forms, and it duplicates Zod's job. Descriptors-as-code composing fixed blocks is the bounded form of the same idea.
- **One unified entity descriptor carrying both read (columns) and write (form) metadata.** Rejected — couples the read and write lifecycles and forces a form slot onto listable-but-not-editable types. Two registries with a shared id constant keep them independent without drift.
- **Force the mod-descriptor schema onto the closed validation vocabulary** (one path absorbs the other). Rejected — either loses validation fidelity the hand-written schema carries or bloats the closed vocab to swallow `baseModDescriptorSchema`, defeating its deliberate limit. Accepting both schema sources is cheaper and keeps each path honest.
- **Render the ecosystem blocks (conditions/effects/modifiers) in the form.** Rejected — their legal contents are cross-entity/ecosystem, unknowable from the open file; rendering them here would invent affordances the layer cannot back. They stay verbatim in the lossless node.

---
