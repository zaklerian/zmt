import type {
  TechTreeExtent,
  TechTreeFolderGeometry,
  TechTreeGridbox,
  TechTreePoint,
  TechTreeYearLabel,
} from '@contracts';
import type {
  AssignmentNode,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

// The `guiTypes` container that holds the folder containers as its direct
// children. A technology's `folder.name` equals one of those children's `name`
// verbatim, so the folders are exactly this container's direct
// `containerWindowType` children — `techtree_stripes`, year gutters, and gridboxes
// all sit one or more levels deeper and never collide with a folder key.
const ROOT_CONTAINER = 'countrytechtreeview';

// Projects the parsed tree-view `.gui` into the folder-keyed geometry map
// (ADR 025). Thin projection (ADR 021): only the render-relevant handful per
// folder is read — its gridboxes, tech-area extent, background sprite reference,
// and the explicit year-gutter labels — and every field is best-effort, carrying
// null/empty rather than an invented default when a folder omits it (doctrine
// folders have no `techtree_stripes` and no gridbox). Everything else in the `.gui`
// is ignored here and round-trips verbatim through the parser. An AST-walking
// extractor over a hoi4 file, it lives beside the entity extractors (not in
// apps/electron) so the mutable parser node types stay off the main-side
// readonly-parameter boundary (P-1).
export function projectTechTreeGeometry(
  script: Script,
): Readonly<Record<string, TechTreeFolderGeometry>> {
  const guiTypes = firstBlock(rootAssignments(script), 'guiTypes');
  if (guiTypes === null) {
    return {};
  }
  const root = containers(guiTypes).find(
    (container) => nameOf(container.block) === ROOT_CONTAINER,
  );
  if (root === undefined) {
    return {};
  }

  const folders: Record<string, TechTreeFolderGeometry> = {};
  for (const folder of containers(root.block)) {
    const folderId = nameOf(folder.block);
    if (folderId === null) {
      continue;
    }
    folders[folderId] = projectFolder(folderId, folder.block);
  }
  return folders;
}

function assignments(block: BlockNode): readonly AssignmentNode[] {
  return block.children.filter(
    (child): child is AssignmentNode => child.kind === 'Assignment',
  );
}

// The `techtree_stripes` container's direct `iconType` child names the folder
// background sprite (`GFX_air_techtree_bg`) — distinct from the container's
// `background { quadTextureSprite = GFX_techtree_stripes }`, which is the generic
// stripes texture shared by every folder. Returns the per-folder sprite reference,
// resolving it to an image being out of scope (the `.gfx`/DDS tickets).
function backgroundOf(stripes: BlockNode | null): null | string {
  if (stripes === null) {
    return null;
  }
  const icon = assignments(stripes).find((a) => keyOf(a) === 'iconType');
  if (icon === undefined || icon.value.kind !== 'Block') {
    return null;
  }
  return stringField(icon.value, 'spriteType');
}

// Every `containerWindowType` at any depth under `block`, each paired with its
// name — used to reach the `techtree_stripes` and year-gutter containers nested
// inside a folder.
function containerDescendants(
  block: BlockNode,
): readonly { readonly block: BlockNode; readonly name: null | string }[] {
  const found: { block: BlockNode; name: null | string }[] = [];
  for (const child of containers(block)) {
    found.push({ block: child.block, name: nameOf(child.block) });
    found.push(...containerDescendants(child.block));
  }
  return found;
}

function containers(
  block: BlockNode,
): readonly { readonly block: BlockNode }[] {
  return assignments(block)
    .filter(
      (a) => keyOf(a) === 'containerWindowType' && a.value.kind === 'Block',
    )
    .map((a) => ({ block: a.value as BlockNode }));
}

// Both axes must be plain numbers; a percent literal (`100%%`) or a missing axis
// yields null rather than a coerced value (the model keeps percent-sized containers
// out of the numeric extent).
function extentField(block: BlockNode, key: string): null | TechTreeExtent {
  const value = firstValue(block, key);
  if (value === null || value.kind !== 'Block') {
    return null;
  }
  const height = numberField(value, 'height');
  const width = numberField(value, 'width');
  if (height === null || width === null) {
    return null;
  }
  return { height, width };
}

function firstBlock(
  entries: readonly AssignmentNode[],
  key: string,
): BlockNode | null {
  const found = entries.find((a) => keyOf(a) === key);
  if (found === undefined || found.value.kind !== 'Block') {
    return null;
  }
  return found.value;
}

function firstValue(block: BlockNode, key: string): null | ParadoxValue {
  const found = assignments(block).find((a) => keyOf(a) === key);
  return found === undefined ? null : found.value;
}

function gridboxesOf(folder: BlockNode): readonly TechTreeGridbox[] {
  return assignments(folder)
    .filter((a) => keyOf(a) === 'gridboxtype' && a.value.kind === 'Block')
    .map((a) => {
      const block = a.value as BlockNode;
      return {
        area: extentField(block, 'size'),
        axis: stringField(block, 'format'),
        name: stringField(block, 'name'),
        origin: pointField(block, 'position'),
        step: extentField(block, 'slotsize') ?? { height: 0, width: 0 },
      };
    });
}

function keyOf(assignment: AssignmentNode): string {
  const { key } = assignment;
  return key.kind === 'StringValue' ? key.value : key.name;
}

function nameOf(block: BlockNode): null | string {
  return stringField(block, 'name');
}

function numberField(block: BlockNode, key: string): null | number {
  const value = firstValue(block, key);
  return value !== null && value.kind === 'NumberValue' ? value.value : null;
}

function pointField(block: BlockNode, key: string): TechTreePoint {
  const value = firstValue(block, key);
  if (value === null || value.kind !== 'Block') {
    return { x: 0, y: 0 };
  }
  return { x: numberField(value, 'x') ?? 0, y: numberField(value, 'y') ?? 0 };
}

function projectFolder(
  folderId: string,
  folder: BlockNode,
): TechTreeFolderGeometry {
  const descendants = containerDescendants(folder);
  const stripes =
    descendants.find((d) => d.name === 'techtree_stripes')?.block ?? null;
  return {
    area: stripes === null ? null : extentField(stripes, 'size'),
    background: backgroundOf(stripes),
    folderId,
    gridboxes: gridboxesOf(folder),
    yearAxis: yearAxisOf(descendants),
  };
}

function rootAssignments(script: Script): readonly AssignmentNode[] {
  return script.children.filter(
    (child): child is AssignmentNode => child.kind === 'Assignment',
  );
}

// A string in value position: a quoted string, a bare identifier, or a resolved
// `@`-symbol (falling back to the symbol name when unresolved). Covers `name`,
// `spriteType`, `format`, `text`, and `pdx_tooltip`, which BICE writes in a mix of
// quoted and unquoted forms.
function stringField(block: BlockNode, key: string): null | string {
  const value = firstValue(block, key);
  if (value === null) {
    return null;
  }
  switch (value.kind) {
    case 'Identifier':
      return value.name;
    case 'StringValue':
      return value.value;
    case 'SymbolValue':
      return value.resolved ?? value.name;
    default:
      return null;
  }
}

// The year gutter is EXPLICIT labels (Step 1 grounding), not a mapping derived
// from the folder file's `@`-symbols. Labels live in containers whose name carries
// `year` (`air_techs_years_left`/`_right`, `support_year_left`,
// `offensive_years`/`defensive_years`); each `instantTextBoxType` inside becomes a
// label carrying its printed `text`, `pdx_tooltip` token, and pixel `position`.
function yearAxisOf(
  descendants: readonly {
    readonly block: BlockNode;
    readonly name: null | string;
  }[],
): readonly TechTreeYearLabel[] {
  const labels: TechTreeYearLabel[] = [];
  for (const container of descendants) {
    if (container.name === null || !container.name.includes('year')) {
      continue;
    }
    for (const entry of assignments(container.block)) {
      if (
        keyOf(entry) !== 'instantTextBoxType' ||
        entry.value.kind !== 'Block'
      ) {
        continue;
      }
      labels.push({
        position: pointField(entry.value, 'position'),
        text: stringField(entry.value, 'text'),
        tooltip: stringField(entry.value, 'pdx_tooltip'),
      });
    }
  }
  return labels;
}
