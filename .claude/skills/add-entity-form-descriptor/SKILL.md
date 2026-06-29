---
name: add-entity-form-descriptor
description: >
  Use this skill whenever the user asks to add or edit an editable
  entity, author a form descriptor, or wire a per-(game, entity) form.
  Triggers: "make X editable", "add a form descriptor for X", "let the
  user edit Y entities", "add an EntityFormDescriptor", "register a
  descriptor for the Z entity", or any request that composes blocks
  into an EntityFormModel and registers it host-side. The skill walks
  through descriptor composition from the block palette, registration
  in the form-descriptor registry, end-to-end reachability (recognizer
  + entity:list channel + extraction + Edit-action), and tests, and
  points at the six existing descriptors as exemplars. Always apply
  this skill for entity-form-descriptor work even if the user does not
  use the word "skill".
---

# Add entity form descriptor

A new editable entity is an `EntityFormDescriptor` that projects a
read-side domain entity into the shell's entity-agnostic
`EntityFormModel`, registered host-side and made reachable from the
table. Six descriptors already exist as exemplars (module, plane,
mod-descriptor, CHARACTER, TECHNOLOGY, STATE); the seventh follows the
same shape. Compose from the block palette — do not invent block kinds.

## Exemplars

The six concrete descriptors, simplest first:

1. **plane** — `libs/r-game-hoi4/src/equipment/plane-form-descriptor.ts`.
   One open property-bag, root scope. Rides the **existing** equipment
   read-side (no plane recognizer) — the reachability carve-out.
2. **module** — `libs/r-game-hoi4/src/module/module-form-descriptor.ts`.
   Open property-bag + one named-nested block per stat block.
3. **STATE** — `libs/r-game-hoi4/src/state/state-form-descriptor.ts`.
   Fixed bag + named-nested (`rows` AND a `namedChildren` map on one
   block) + list-of-scalars. `history/`-rooted, not `common/`.
4. **CHARACTER** — `libs/r-game-hoi4/src/character/character-form-descriptor.ts`.
   Fixed bag with an `enum` field + named-nested with `listChildren`
   and `namedChildren` (the two-level `portraits → group → key`).
5. **TECHNOLOGY** — `libs/r-game-hoi4/src/technology/technology-form-descriptor.ts`.
   Fixed bag + two object-lists (one with a nested `position` object) +
   ref-list-of-scalars. The object-list exemplar.
6. **mod-descriptor** — host-built `EntityFormModel` (not a per-game
   descriptor): `apps/zmt/src/features/mod-info-edit/hooks/use-mod-descriptor.hook.ts`.
   The external-`schema()` path (a plugin-supplied Zod schema instead
   of generated validation).

Supporting infrastructure:

- **Block model** — `libs/r-core/src/entity-form/entity-form-block.model.ts`.
- **Form model / `defineEntityFormDescriptor`** —
  `libs/r-core/src/entity-form/entity-form.model.ts`.
- **Field spec / validation vocabulary** —
  `libs/r-core/src/entity-form/field-spec.model.ts`.
- **Registry** —
  `apps/zmt/src/shared/entity-form/entity-form-registry.service.ts`.
- **Write path** —
  `apps/electron/src/main/fs/entity-mutation.service.ts`.
- **Reachability chain** (module): recognizer
  `libs/r-game-hoi4/src/module/module-recognizer.ts` →
  `IPC_CHANNELS.module.list` handler
  `apps/electron/src/main/setup/module-handlers.setup.ts` → extraction
  `libs/e-game-hoi4/src/module/extract-modules.util.ts` → registration
  `libs/r-game-hoi4/src/hoi4-renderer-plugin.const.ts` → Edit action
  `libs/r-game-hoi4/src/module/module-actions.ts`.

## Workflow

### 1. Compose the intrinsic surface from blocks

Project the entity into `EntityFormModel.blocks`. Use
`defineEntityFormDescriptor<TSubject>` for a subject-typed `project`;
the stored descriptor is type-erased. Each block carries a `scope`
(its `EntityWriteScope` write target) and an optional `sectionLabel`.

**Block palette** (`EntityFormBlock` union), each with its write scope:

- **propertyBag** — scalars at the entity root. Two facets share the
  `FieldSpec` shape: `mode: 'open'` is a free key→value bag (combobox
  `knownKeys` suggestions + add/remove, bound to one field-array
  `name`; e.g. plane, module scalars); `mode: 'fixed'` is a closed set
  of named scalar fields each bound to a root value key = its field
  name (e.g. CHARACTER's `name`, STATE/TECHNOLOGY root specs).
  A fixed field may be `readonly` (renders disabled) and its `spec`
  drives the control — `enum` → closed select, `type: boolean` →
  yes/no select, else text. Scope `null`.
- **namedNested** — one level deep named child as a key→scalar map
  (`rows`), written to its named-child scope (e.g. `['add_stats']`,
  `['buildings']`). Two optional facets: `listChildren`
  (list-of-scalars under the block, e.g. a role's `traits`) and
  `namedChildren` (`NamedScalarChild[]` — the bounded second nesting
  level, e.g. `portraits → army`, or STATE's `buildings → naval_base`).
  A block may co-populate `rows` AND `namedChildren` (STATE buildings).
  `knownKeys` carries per-key validation.
- **listOfScalars** — bare value-list tokens bound to one value key
  (e.g. `traits`, STATE `provinces`, TECHNOLOGY ref-lists). Usable
  top-level or as a `namedNested` list child.
- **objectList** — repeated same-name blocks (e.g. `path`, `folder`),
  positional, rendered as add/remove item cards. `name` is both the
  repeated block name and the RHF field-array binding. Each item is
  the `fields` scalar specs plus optionally ONE `nested` named object
  (e.g. `folder`'s `position`). Items addressed by an indexed scope
  segment `{ name, index }`; `OBJECT_LIST_ITEM_INDEX_KEY` carries each
  item's original block index (null for a form-added item).

Nesting caps at **two levels** (named block → named child → scalar
leaves; object-list item → one nested object). Recursion is rejected —
anything deeper stays in the lossless node.

The `EntityFormModel` also carries `dialogTitle`, `errorTitle`,
`errorMessage` (maps an `IpcError` code to a user-facing string —
display-layer mapping per R-CODE-5, not invention), optional `note`,
`save`, and optional `schema`.

**Intrinsic / relational gate (ADR 018 point 5, R-CODE-5).** Model
only fields whose meaning is intrinsic to the open file. A field with
an intrinsic known set → that set as suggestions plus free-text; a
field whose legal values are defined by other entities → plain
free-text (the open file cannot enumerate them); an intrinsic closed
value set → `enum`. The shared ecosystem sub-vocabularies
(condition/effect/modifier blocks, equipment-stats and any unmodeled
sub-block) are never rendered or rewritten — they stay verbatim in the
lossless parsed node and ride through a save untouched. The write path
is surgical: it edits only the keys named in the delta, so everything
unmodeled is preserved by construction.

**Validation vocabulary** (`FieldValidation`, closed —
`required`/`type`/`min`/`max`/`pattern`/`enum`). The exact key set is
what lets the type system reject unknown keys; it lowers to a generated
Zod schema. `required` means non-empty-when-present, NOT key-must-exist
(editing operates on files that legitimately omit optional keys).
Alternatively a descriptor supplies an external schema via
`EntityFormModel.schema()` (the mod-descriptor path) instead of
generated validation.

### 2. Register the descriptor

Export `const X_FORM_DESCRIPTOR = defineEntityFormDescriptor<...>({ entityId, gameId, project })`
and add it to `formDescriptors` in
`libs/r-game-hoi4/src/hoi4-renderer-plugin.const.ts`.
`registerPluginFormDescriptors` registers it into the host-side
`entityFormRegistry`, keyed `(gameId, entityId)`.

`entityId` **reuses the shared entity-identifier constant** (e.g.
`MODULE_ENTITY_ID = 'hoi4-module'`) — the same constant the read-side
recognizer uses as its `id`. The two registries (recognizer, form
descriptor) share only this constant, which keeps read and write keyed
identically and from drifting (ADR 018).

### 3. Make it reachable (reachability-is-done)

A descriptor that nothing can open is not done. The Edit action calls
`context.presentEntityForm(gameId, entityId, entity)`; the shell
resolves the descriptor and projects. The entity must therefore be
listed in the table, which requires the read-side chain:

- **Recognizer** (`EntityTableRecognizer`, `libs/r-game-hoi4/src/<domain>/<x>-recognizer.ts`)
  — `matches(filePath)` (segment-boundary check on `*_DIR_SEGMENTS`)
  and `load` (calls the `entity:list` channel, builds rows + actions).
- **`entity:list` channel** — channel const in `@contracts`, main
  handler in `apps/electron/src/main/setup/<domain>-handlers.setup.ts`
  delegating to a list service.
- **Extraction util** (`libs/e-game-hoi4/src/<domain>/extract-*.util.ts`)
  — parses the file into the read-side entity, carrying the `node` and
  preserving unmodeled blocks.
- **Edit-action wiring** (`<domain>-actions.ts`) — an Edit action whose
  `execute` calls `presentEntityForm`, `isAvailable` gated on
  `context.writable && hasSelection`; registered via the recognizer's
  `load` `actions`.
- **Registration** — recognizer added to `recognizers` in
  `hoi4-renderer-plugin.const.ts`.

**Carve-out:** if an existing read-side already lists the entity, reuse
it — do NOT add a parallel recognizer/channel/extraction. The plane
descriptor reuses `EQUIPMENT_ENTITY_ID` and the existing
`EQUIPMENT_RECOGNIZER`; only the descriptor and its Edit action are
new.

**Non-`common/` root (STATE precedent):** the recognizer's
matching mechanism is root-agnostic — only the per-entity
`*_DIR_SEGMENTS` and the extraction DIR constants are root-bound.
STATE is `history/`-rooted (`['history', 'states']`) with no other
change. The registry and matching mechanism stay agnostic.

### 4. The write contract it relies on

`save` computes a scoped-delta batch and dispatches one
`api.entity.write({ deltas, entityName, modId, relativePath })`
(`EntityWriteRequest`). Each `EntityBlockDelta` is `{ block, added,
changed, removed }`: `block` is the `EntityWriteScope` (null/empty =
entity root; a name+index path otherwise). Snapshot each bag/list at
open so save diffs against the original projection. `entityName` is the
block name the write path locates (e.g. CHARACTER's `token`, STATE's
literal `'state'` block).

This is **edit/delete only** — patches existing blocks (with
add-on-first-write materialization of an absent container for an
added-only delta) and the `entity:delete` channel. There is NO entity
create/insert path (L-012, in discussion); an Add action stays stubbed.

### 5. Tests

Mirror the exemplars: a delta-util spec (`*-delta.util.spec.ts`)
asserting the snapshot→values diff, a recognizer spec for `matches`,
and an extraction spec. Assert on locale-independent surfaces per
R-CODE-7.

## Verify

- `nx affected -t typecheck test build` is green.
- The descriptor resolves: opening the entity's file lists it; the Edit
  action presents the form with the projected blocks.
- A round-trip edit writes only the touched keys; unmodeled
  ecosystem/sub-blocks are byte-preserved.
- Dry read-through against a new bucket-A entity (e.g. building): the
  block palette + scope + registration + reachability steps produce a
  correct descriptor without further design.

## Rule references

ADR 010 (plugin architecture), ADR 015 (business actions), ADR 018
(entity-form shell + descriptors), ADR 019 (atomic batched scoped
deltas), R-CODE-5 (render backend responses; lossless preservation),
R-CODE-7 (locale-independent test surfaces), R-ELECTRON-2 (cross-process
identifiers via @contracts), R-TS-4 (readonly cross-process types),
R-PROJ-6 (group by subject domain). The reachability-is-done principle
(a descriptor nothing can open is not done) governs step 3.
