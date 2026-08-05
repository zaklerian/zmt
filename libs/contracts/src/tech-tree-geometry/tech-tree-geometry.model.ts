import type { ModId } from '../workspace';

// A width/height pair — a gridbox `slotsize` (cell step) or a container `size`
// (tech-area extent). Held only when both axes are plain numbers; a percent
// literal (`100%%`) on either axis yields a null area rather than a coerced value.
export interface TechTreeExtent {
  readonly height: number;
  readonly width: number;
}

// The render geometry for one research folder, keyed by `folderId` = the `.gui`
// `containerWindowType` `name`, which a technology's `folder.name` matches verbatim
// (`air_techs_folder`, `mtgnavalfolder`, …). `area` is the folder's tech-area
// container extent (`techtree_stripes` `size`), null when the folder declares none
// (doctrine folders do not). `background` is the folder background sprite
// REFERENCE (`GFX_air_techtree_bg`); resolving it to an image is the `.gfx`/DDS
// tickets, out of scope here. Every field is thin-projected and best-effort — a
// folder that omits one carries null/empty rather than an invented default
// (ADR 021 thin projection).
export interface TechTreeFolderGeometry {
  readonly area: null | TechTreeExtent;
  readonly background: null | string;
  readonly folderId: string;
  readonly gridboxes: readonly TechTreeGridbox[];
  readonly yearAxis: readonly TechTreeYearLabel[];
}

// The folder-keyed geometry map the `techTreeGeometry:read` channel returns: every
// folder the tree-view `.gui` declares, plus the winning file's provenance. The
// canvas selects one folder by a technology's `folder.name`. This is its own read
// channel, NOT `index:list`: geometry is a resolved-file config singleton, not a
// collection of same-named entities (ADR 025 decision 2).
export interface TechTreeGeometry {
  readonly folders: Readonly<Record<string, TechTreeFolderGeometry>>;
  readonly provenance: null | TechTreeGeometryProvenance;
}

// Provenance for the singleton read: which source's `.gui` won load-order
// resolution (ADR 016 stage 1). `reason` mirrors `ResolvedFile['reason']`.
// Null when no source declares the tree-view `.gui` at all.
export interface TechTreeGeometryProvenance {
  readonly absolutePath: string;
  readonly modId: ModId | null;
  readonly reason: 'last-wins' | 'replace-path' | 'sole-provider';
  readonly relativePath: string;
}

// One gridbox inside a folder: the cell→pixel grid a technology is laid on.
// `origin` is the gridbox `position` (the pixel anchor of cell 0,0), `step` the
// `slotsize`, `axis` the `format` growth direction (`"UP"` in BICE). A folder
// carries the LIST of its gridboxes, not a single collapsed origin: BICE's
// `air_techs_folder` declares four gridboxes at four different origins
// (`{190,172}`, `{340,32}`, `{1075,32}`, `{1610,32}`), so a single per-folder
// origin — as ADR 025's "gridboxes share an origin" reading assumed — would
// misplace every generic air technology. Country folders (e.g. `britishair_folder`)
// happen to share one origin, and there the list simply repeats it. `area` is the
// gridbox's own `size` when declared, null otherwise.
export interface TechTreeGridbox {
  readonly area: null | TechTreeExtent;
  readonly axis: null | string;
  readonly name: null | string;
  readonly origin: TechTreePoint;
  readonly step: TechTreeExtent;
}

// A pixel coordinate pair — a gridbox origin or a year-label position, read
// verbatim from the tree-view `.gui`.
export interface TechTreePoint {
  readonly x: number;
  readonly y: number;
}

// One year-gutter label, read verbatim from the `.gui`. Grounding against BICE
// established the gutter as EXPLICIT label instances (an `instantTextBoxType` per
// year), not a mapping derived from the folder file's `@`-symbols: `text` is the
// printed year string, `tooltip` the `pdx_tooltip` token (`YEAR_1936`), `position`
// its pixel spot. `text`, `tooltip`, and a technology's `position.y` cell row are
// three distinct quantities that BICE keeps distinct (a label reads `"1945"` under
// tooltip `YEAR_1946`), so both text and tooltip are carried and neither is derived
// from the other.
export interface TechTreeYearLabel {
  readonly position: TechTreePoint;
  readonly text: null | string;
  readonly tooltip: null | string;
}
