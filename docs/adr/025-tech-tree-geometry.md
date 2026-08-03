# ADR 025 — Tech-tree geometry from the tree-view `.gui`

- **Status**: Accepted
- **Date**: 2026-08-03

_The tech-tree editor renders the research tree at the game's real geometry, not a synthesized
grid. That geometry is declared in `interface/countrytechtreeview.gui`, and a technology's
`position` is grid cells the `.gui`'s `slotsize` converts to pixels. This records the read + render
model — a standalone resolved-file read distinct from the ADR 024 entity index, a thin projection
over an otherwise-lossless `.gui` (the ADR 021 pattern), and the grammar and classification
prerequisites the read depends on. It is additive to ADR 016, 021, 022, and 024 and amends none of
them. Editing the geometry is deliberately deferred to the write boundary._

## Context

The prior decision on the tech-tree (TL) canvas was to render on the **game's real geometry** —
parse the tree-view `.gui` and place nodes where the engine places them — rather than to synthesize
a grid from each technology's `start_year`. Synthesizing loses the two things the editor is for:
"change the folder background" and "configure the tech area / year range" have nowhere to bind if
the `.gui` the engine actually reads is never opened.

That geometry lives in `interface/countrytechtreeview.gui`. Read against BICE, the file describes
the **whole** tech-tree view — one `containerWindowType` per research folder (`infantry_folder`,
`air_folder`, `italyair_folder`, …) — and within each folder the render-relevant elements are:

- **`gridboxtype`** — its `position` is the pixel origin (the grid cell `0,0` anchor; e.g.
  `{ x = 200 y = 172 }`), its `slotsize` is the cell→pixel step (`{ width = 70 height = 70 }` for
  the technology grids), and its `format` gives the axis growth direction (`"UP"` for those grids).
  A folder carries **several** gridboxes — one per sub-tree (`infantry_weapons_tree`,
  `assault_rifle_tree`, …) — which share an origin; "a gridbox" in the survey is, on disk, the
  folder's set of gridboxes.
- a container (`techtree_stripes`, one per folder) whose `size` is the tech area extent
  (e.g. `{ width = 4300 height = 1950 }`);
- an `iconType` referencing the folder background sprite (`GFX_air_techtree_bg` for the air folder,
  `GFX_infantry_techtree_bg` for infantry, and so on — one per folder);
- year-gutter label elements (`instantTextBoxType`, carrying the printed `text` and a `pdx_tooltip`
  year token) down the left of each folder.

`slotsize` is engine-consumed: the 70px step is the real cell size the engine lays the grid on, not
an editor convention — it is a per-`gridbox` property to be read, not a constant to hard-code (the
same file also carries `60×60`, `200×20`, and other slotsizes on non-technology grids).

A technology's `position { x, y }` is in **grid cells**, frequently supplied via `@`-substitution
symbols (`x = @FTR_START`, `y = @1936`); the `@`-symbol model (ADR 022) preserves and resolves
these. `slotsize` converts cells to pixels; the canvas places a node at
`gridbox.position + cell × slotsize`, honouring `format` for the growth direction.

### The year gutter is a reconciliation of two sources, not a `.gui` constant

The year↔cell mapping is **per folder file, not a global `.gui` constant.** In BICE the year symbol
`@1936` resolves to a _different cell row in each file_: `@1936 = 4` in `ENG_air.txt`, `@1936 = 2`
in `FRA_air.txt`, `@1936 = 8` in `GER_air.txt`. So the year axis is a reconciliation of two
sources: the `.gui` gutter container (style and pixel position of the printed labels) and the
**folder file's** year-valued position symbols (which cell a year maps to). Three quantities that
are routinely conflated and are distinct:

- **`start_year`** — the technology's actual in-game research year;
- **`position.y`** — the technology's grid **row** (a cell index, not a year), commonly `@1936`;
- **the gutter year label** — the year printed at a given row by the `.gui`.

The convention for _which_ `@`-symbol is a year — `@1936` names a year, `@FTR_START` does not —
is a rule this ADR deliberately **does not assert**. BICE's data is suggestive (numeric-named
symbols sit in `position.y`, mnemonic ones like `@FTR_START` / `@INT` sit in `position.x`), but the
deciding rule must be **grounded against BICE at implementation time**, not recalled here. It is
recorded as an open implementation question with a named resolution step (ledger `L-021`),
consistent with the lesson ADR 022, 023, and 024 each paid for: an on-disk shape is read, not
remembered.

### Two prerequisites the read has to clear first

`.gui` does not parse today. It uses `%` / `%%` percent literals (`width = 100%%`) and `rgb` / `hsv`
keyword-tuple blocks, which the grammar lacks — ADR 022 deliberately deferred them while landing
`@NAME` (ledger `L-017`). And `.gui` / `.gfx` are absent from `DEFAULT_FILE_CLASSIFICATION`
(`apps/electron/src/main/fs/default-file-classification.const.ts` lists only data/html/text and
image extensions). Neither is a separate decision; both are prerequisites folded into this read.

## Decision

### 1. Geometry is sourced from the tree-view `.gui` and rendered at real scale

The canvas places each node at `gridbox.position + cell × slotsize`, honouring the gridbox's
`format` for axis growth direction, inside the folder container's declared `size`. The folder
background sprite and the year-gutter labels are read from the same `.gui`. The result is a real
coordinate system: node placement is faithful to where the engine draws the tech.

Synthesizing the grid from `start_year` alone is **rejected** — it leaves "change background" and
"configure area / year range" with nowhere to bind, and it discards the `.gui` the engine actually
consumes. Ignoring the `.gui` entirely is the same rejection by another name.

### 2. Geometry is a standalone resolved-file read — not an entity-index type

Tech-tree geometry is a **singleton file-property**: one `countrytechtreeview.gui`, resolved across
sources by load order. It is **not** a collection of same-named entities, so the ADR 024 index's
stage-2 entity resolution has nothing to resolve — there is exactly one file, not a set of tokens
to last-wins-dedupe. Routing it through the index would shoehorn a one-element collection into
machinery built for many.

The read therefore reuses **stage 1 only**: `resolveLoadOrder` (ADR 016) settles which source's
`.gui` wins, the winning file is parsed, and the geometry elements are projected — with its own
trivial cache (one file, read rarely). It does not register in the entity index.

The contrast with ZMT-35 is the reusable rule, not a one-off. A technology **category** fit the
entity index because a category vocabulary is a _collection_ — a set of tokens contributed across
files and resolved last-wins. Geometry is a _config singleton_. **Collection → entity index;
singleton file-property → standalone resolved-file read.** The distinction is the decision; the
one-element-collection shoehorn is the failure it avoids.

### 3. Thin projection; everything else lossless (the ADR 021 pattern)

The geometry model projects only the render-relevant handful — `origin`, `step`, `axis`, `area`,
the year-gutter mapping, and the background-sprite reference — plus provenance (which source's
`.gui` won). Every other `.gui` element is untouched and round-trips **verbatim** through a parse
and re-serialize. This is ADR 021's thin-editable-surface principle applied to `.gui`: project the
handful the editor needs, carry the rest lossless, and never invent structure the file did not
declare.

### 4. Read and render only in the first cut; editing follows the write boundary

"Change background" and "configure area / year range" are **writes into `.gui`**. They require the
write boundary — the format strategies that let a `.gui` be mutated and re-serialized — which does
not exist yet. This decision covers the **read + render** model only. Editing the geometry lands
with the write-boundary work, and the read model is shaped so that editing is a **later addition,
not a reshape**: the projected fields are the ones a future editor writes back through. This is the
same read-before-write split every entity slice in this project has taken.

### 5. Grammar and classification are prerequisites of the read, each with a round-trip gate

Two gaps are folded into the implementation of this read, not tracked as independent decisions:

- **Grammar** — add `%` / `%%` percent literals and `rgb` / `hsv` keyword-tuple blocks to the
  paradox grammar (`libs/paradox-parser/src/cst/paradox.grammar`). The additions **must not
  perturb** the `@`-symbol forms already landed: `@NAME` (`SymbolValue`), `@[ expr ]`
  (`BracketExprToken`), and `variable@token` (the `@` as a legal interior identifier char). Each is
  gated by a round-trip test (`COPY ast/round-trip.spec.ts`).
- **Classification** — add `.gui` / `.gfx` to `DEFAULT_FILE_CLASSIFICATION` so the files are
  recognised and openable, also under a round-trip gate.

Recording them as prerequisites keeps ledger `L-017` (the `.gui` grammar gap) from being
re-discovered as a surprise at implementation.

## Consequences

**Positive**

- The canvas has a real coordinate system; node placement is faithful to the game's geometry rather
  than to a grid the editor invented.
- Stage-1 load-order resolution (ADR 016) does work for a config singleton for the first time —
  geometry is resolved across sources with provenance, without the entity-index machinery it does
  not need.
- The projection is thin and the `.gui` is otherwise lossless, so a `.gui` element the model does
  not yet understand survives a round-trip untouched (the ADR 021 guarantee, extended to `.gui`).

**Negative / accepted**

- The year axis depends on the **folder file's** symbol table (ADR 022), not on the `.gui` alone —
  a cross-file dependency the model must make explicit. `@1936` resolving to `4` in one file and `8`
  in another is data, not a bug; a model that reads the year from the `.gui` gutter alone would be
  wrong for every folder whose file disagrees with its neighbours.
- `start_year`, `position.y`, and the gutter year label are **three distinct quantities**;
  conflating any two is a defect, and the model is shaped to keep them separate.
- Editing geometry is blocked on the write boundary (decision 4); the read model carries the cost
  of being shaped for an editor that does not exist yet.

**Deliberately out of scope, recorded so the omission does not read as oversight**

- Any change outside `docs/`. Reading code and BICE to verify is expected; editing is not. The
  grammar, classification, read service, and canvas land in later tickets.
- The `.gfx` sprite model and DDS decode — resolving the background _image's pixels_ is a separate
  ticket. This decision records the background _reference_, not its bitmap.
- The write boundary and geometry editing (decision 4).
- The canvas component itself.
- Asserting the year-symbol convention. Its absence here is **deliberate** (ledger `L-021`), not an
  oversight — it is grounded at implementation, per the on-disk-shape-is-read lesson.

## Alternatives considered

- **Synthesize the grid from `start_year`.** Rejected — it discards the `.gui` the engine reads and
  leaves the two editor affordances (background, area/year range) with nothing to bind to
  (decision 1).
- **Route geometry through the ADR 024 entity index.** Rejected — geometry is a singleton
  file-property, not a collection; the index's stage-2 same-name resolution has nothing to resolve,
  and forcing a one-element collection through it inverts the collection-vs-singleton distinction
  ZMT-35 and this ADR both turn on (decision 2).
- **Edit the geometry now, in the first cut.** Rejected — "change background" and "configure area"
  are writes, and the write boundary does not exist yet. Reading and rendering first, editing when
  the write boundary lands, is the split every slice has taken (decision 4).
- **Assert the year-symbol convention (`@1936` is a year, `@FTR_START` is not) in this ADR.**
  Rejected — BICE evidence is suggestive but the deciding rule is grounded at implementation, not
  recalled. Recorded as ledger `L-021` with a named resolution step rather than asserted here.
