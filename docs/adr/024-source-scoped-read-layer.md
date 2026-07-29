# ADR 024 — Source-scoped entity read layer

- **Status**: Accepted
- **Date**: 2026-07-29

_The read model and the write model are not the same shape. Every entity read today is
file-scoped; the tech-tree editor needs a mod-scoped read that resolves load order across sources
and keeps the provenance the resolver already computes and discards. This records that read layer
as the equipment resolution pattern generalized across entity types — cached, provenance-bearing,
and subsuming the module catalog. It is additive to ADR 013, 014, 016, 019, and 020 and amends
none of them._

## Context

Every entity read in the app is **file-scoped**. `api.<entity>.list(filePath)` takes a path;
`listModules(filePath)`, `listEquipment(filePath)`, and the rest each parse one file. The
renderer-side `EntityTableRecognizer.load(filePath, translate)` contract is the same shape: the
ML flow is "click a file → table of the entities in that file." This is correct for ML, where a
file is the unit of work.

The tech-tree (TL) editor is **mod-scoped**. It must show the whole air-research tree — vanilla
technologies plus mod overrides, load-order resolved — with each entity knowing which source won
and what it shadowed. No file-scoped read can express that: it is a read *across* sources, not
*of* a source.

The machinery already exists, wired to exactly one entity type. In
`apps/electron/src/main/equipment/`:

- `enumerateEquipmentSources` is **folder-scoped**: it `readdir`s `common/units/equipment` (the
  hard-coded `EQUIPMENT_DIR`) on each projected source, `.txt` files only, and reads each source's
  `replace_path` declarations.
- `resolveLoadOrder` (ADR 016) settles those per-source file lists into a load order, honouring
  per-source `replacePaths`.
- The winners are parsed and extracted.

`ProjectedSource` already carries `{ path, permission: 'editable' | 'readonly' }` — vanilla as a
readonly source is already modelled (ADR 014). And `resolveLoadOrder` already computes, per file,
`winningSource`, `shadowedSources`, and `reason: 'last-wins' | 'replace-path' | 'sole-provider'`
(`resolution.model.ts`, the `ResolvedFile` shape). **This provenance is computed and thrown away:**
`resolveEquipmentFiles` maps each `ResolvedFile` to `file.absolutePath` and discards
`winningSource`, `shadowedSources`, and `reason`. It never crosses IPC.

There is one other mod-wide read: `catalog-modules.service.ts`. It enumerates module files across
projected sources and dedupes by name (a `byName` map, entity-level last-wins — explicitly *not*
the ADR-016 file resolver). It is uncached — it re-enumerates and re-parses every source on every
call (L-013). Its enumeration directory comes from `MODULE_DIR` in `@e-game-hoi4`; the renderer's
`module-recognizer` independently hard-codes the same location as `MODULE_DIR_SEGMENTS`, so "where
modules live" is stated in two places across the process boundary (L-014).

So the read layer is **not new machinery**. It is the equipment pattern — enumerate folder-scoped
across sources, resolve load order, parse winners — generalized across entity types, *keeping* the
provenance the resolver already produces, cached, and subsuming `catalog-modules`.

## Decision

### 1. The read model and the write model are asymmetric — and noticing that is the decision

The read model is **source-scoped**: for an entity type, enumerate its files across all projected
sources, resolve load order, parse the winners, extract, and attach provenance. The write model
stays **targeted**: a write addresses one editable file (`entity-mutation.service`, ADR 019,
unchanged). An entity read out of a merged view carries the provenance needed to write back into
the editable source that owns it — never into a readonly (vanilla) source.

The core of this ADR is refusing to force one shape onto both. Reads fan out and merge; writes
stay pinned to a single file. The provenance on a read row is exactly what routes a later write to
the editable owner.

### 2. A generic index, parameterized by a main-side entity registry

Each entity type registers `{ entityId, folder, extract, slimProjector }`:

- `folder` — the directory to enumerate. This generalizes equipment's hard-coded `EQUIPMENT_DIR`
  and becomes the **single home** for an entity type's file location, closing L-014 on the
  enumeration side (see the consequence note on the recognizer).
- `extract` — the existing per-entity extractor, unchanged.
- `slimProjector` — decision 4.

The index is generic over this registry. It does **not** touch the renderer-side
`EntityTableRecognizer` — a different contract, a different layer, the ML file-view's concern. The
two read paths coexist by design: ML stays file-scoped through the recognizer; TL is mod-scoped
through the index. There is no recognizer migration.

### 3. Provenance is surfaced, and normalized

Stop discarding `resolveLoadOrder`'s output. Each indexed entity carries
`{ id, sourceId, shadowedSourceIds, reason }`. The index returns a companion `sources` table,
`sourceId → { modId, path, permission }`. The renderer joins each row to that table for the
provenance column — winning source, what it shadowed, why.

The `reason` rides the row because it is per-entity-file. Source details are normalized into the
`sources` table rather than denormalized onto every row: a row carries source *ids*, not full
source objects, so a source's `{ modId, path, permission }` is stored once instead of duplicated
across thousands of entities.

### 4. Slim/detail split via per-entity projectors — not a query language

Two generic channels:

- `index:list(entityType, modId)` → slim rows: each entity's `slimProjector` output plus its
  provenance. Technology's projection is its graph shape (token, `position`, `path` edges,
  `dependencies` edges, categories, start year) — enough to render the canvas, not the whole
  entity. A module's is `(name, category)`.
- `index:detail(entityType, id)` → the full entity, for the hover card and the edit form.

A GraphQL-style query layer over IPC is **rejected**. No one writes queries; the actual need is
"load slim, hydrate on demand," which two channels plus a per-entity projector satisfy without a
resolver layer, an N+1 surface, or a schema to maintain. **Reversal trigger:** if the number of
distinct slim shapes an entity needs grows past what one projector can express, or consumers begin
needing arbitrary field subsets, revisit. Until then, two channels.

### 5. Cache invalidation: on write, plus an mtime check on read; whole-entity-type rebuild

There is no file watcher — chokidar is deferred (L-002). The cache is invalidated on our own
writes, and a read stat-checks the enumerated files' mtimes to catch edits made outside the app
(the stat is negligible beside the parse it guards). On invalidation the **whole entity type's**
index rebuilds: writes are rare and user-initiated, and a mod-wide re-resolve is cheap next to the
parse it already performs.

**Named upgrade path:** per-file-granular rebuild — re-parse only the touched file, re-resolve
only the entities it provides — taken only when a whole-type rebuild is *measurably* slow, not
pre-emptively.

### 6. The index subsumes `catalog-modules`

Module registers in the index; `catalog-modules.service` is deleted; its consumers read from the
index. This closes L-013 (the index is cached, the catalog was not) and moves the module folder
location into the registry (L-014, enumeration side).

Module is the **second** index consumer by design. A generic abstraction validated against a
single consumer over-fits that consumer's shape; module's file topology
(`common/units/equipment/modules`, a directory *nested under* equipment's) is a deliberately
different shape from technology's, and making the registry fit both before it ossifies is the
point. One consumer would over-fit; the second is the validation.

### 7. Enumeration is folder-scoped; vanilla is never read whole

The index `readdir`s only an entity type's declared folder(s) on each source, so vanilla is read
at folder granularity — never in full. The S-2 "feature-scoped vanilla loading" idea (load only
what an enabled feature needs) is a *further* narrowing layered on feature membership; it is out of
scope here. The boundary is recorded so the two are not conflated: folder-scoping is this ADR;
feature-scoping is a later, independent narrowing.

### 8. Equipment does not migrate onto the index

Equipment already works on its bespoke `resolveLoadOrder` path. The index is additive; its first
consumers are technology and module. Migrating a working slice for uniformity is rejected as a
gratuitous refactor. Equipment migrates when it is next touched or when it needs provenance
surfaced — not now.

## Consequences

**Positive**

- `resolveLoadOrder` becomes real for entities beyond equipment. ADR 013 and 016 were live for
  equipment and latent for every other entity type; the index is where they start doing work for
  technology and module.
- The resolver's provenance — the **shadowed set and the `reason`** — crosses IPC for the first
  time, so the renderer can show not just which source won but what it shadowed and why. (A bare
  winning-source string already crosses today for modules via `CatalogModule.source`, but that
  comes from name-identity dedup, not the file resolver, and carries neither the shadowed set nor
  the reason.)
- L-013 closes (the index is cached) and L-014 closes on the enumeration side (the folder location
  lives in the registry, the one home the catalog read from).
- The write path is unchanged. Reads merge; writes stay targeted; the provenance on a read row is
  what routes a write to the editable owner and keeps it out of a readonly source.
- The index is the read foundation the tech-tree canvas, the hover card, and the edit form all
  build on — one source-scoped read behind all three, rather than three ad-hoc mod-wide reads.

**Negative / accepted**

- Two read paths now exist: the file-scoped recognizer for ML, the source-scoped index for TL.
  This is **deliberate asymmetry, not duplication** — the two answer different questions (this
  file's entities vs. the whole mod's resolved entities) and share the extractors underneath. It
  is recorded here precisely so a future reader does not "unify" them into one shape and lose the
  distinction decision 1 rests on.
- L-014's closure is scoped to enumeration. The renderer's `module-recognizer` keeps its own
  `MODULE_DIR_SEGMENTS` for its path-match predicate, because ML's recognizer is not migrated
  (decision 2). The single-home guarantee holds for the main-side enumeration the catalog used;
  pointing the recognizer's predicate at the same home is a residual folded in only if and when
  the recognizer is next touched.

**Deliberately out of scope, recorded so the omission does not read as oversight**

- Any change outside `docs/`. This ADR is the decision record; implementation lands in later
  tickets (the canvas, the channels' renderer consumers, geometry, the edit form).
- Feature-scoped vanilla loading (S-2) — a narrowing beyond this ADR's folder-scoping (decision 7).
- Equipment's migration onto the index (decision 8).

## Alternatives considered

- **Reuse one shape for both read and write.** Rejected — this is the inverse of decision 1. A
  single shape either forces the write to address a merged view (and then decide which source a
  merged row belongs to at write time, having thrown that away) or forces the read to stay
  file-scoped (and then TL cannot express a mod-wide resolved tree at all). The asymmetry is the
  decision, not an accident of two code paths.

- **Denormalized provenance rows** carrying the full source object on every entity. Rejected — a
  source's `{ modId, path, permission }` would be duplicated across thousands of entity rows. The
  `reason` is per-file and rides the row; the source details are normalized into a companion
  `sources` table joined by id (decision 3).

- **A GraphQL-style query layer over IPC.** Rejected — no consumer writes queries; the need is
  "slim list, hydrate on demand," which two channels plus a per-entity projector meet without a
  resolver layer, an N+1 surface, or a schema to maintain (decision 4). The reversal trigger is
  recorded there.

- **Per-file-granular cache rebuild** from the start. Rejected as premature — a whole-entity-type
  rebuild is cheap against the parse it already does, and writes are rare. Recorded as the named
  upgrade path, taken only on a measured slow rebuild (decision 5).

- **Migrate equipment onto the index now** for uniformity. Rejected — equipment already resolves
  correctly on its own path; migrating a working slice with no new requirement is a gratuitous
  refactor (decision 8).
