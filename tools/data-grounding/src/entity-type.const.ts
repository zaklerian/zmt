// The entity types the extractors recognize, and the directory-segment chain
// that classifies a file as one — a deliberate mirror of the renderer recognizers
// (`libs/r-game-hoi4/src/<entity>/<entity>-recognizer.ts`). Those recognizers are
// renderer code (`window.api`, columns, actions); importing them into this
// main-side tool would cross the renderer boundary (R-REACT-1), so the path
// convention is duplicated here with this pointer. If a recognizer's segments
// change, this table changes in the same PR (R-WORK-2). `technologyCategory` has
// no renderer recognizer (it is read through the generic index, not a table
// recognizer, ZMT-35); its segments mirror TECHNOLOGY_CATEGORY_DIR in e-game-hoi4.
export const ENTITY_TYPES = [
  'character',
  'equipment',
  'ideology',
  'module',
  'state',
  'technology',
  'technologyCategory',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_DIR_SEGMENTS: Readonly<
  Record<EntityType, readonly string[]>
> = {
  character: ['common', 'characters'],
  equipment: ['common', 'units', 'equipment'],
  ideology: ['common', 'ideologies'],
  module: ['common', 'units', 'equipment', 'modules'],
  state: ['history', 'states'],
  technology: ['common', 'technologies'],
  technologyCategory: ['common', 'technology_tags'],
};

// A file is of an entity type when the type's dir segments appear as consecutive
// path segments with the file directly inside the innermost one — a
// segment-boundary check, not a prefix, so `.../equipment/foo.txt` (equipment) and
// `.../equipment/modules/foo.txt` (module) never cross-match. This is the exact
// rule the recognizers apply.
export function classifyEntityFile(relativePath: string): EntityType | null {
  const segments = relativePath.split(/[/\\]/).filter((s) => s.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return null;

  // At most one type matches: the "directly inside" rule below means a module
  // file (`.../equipment/modules/x.txt`) matches only the module chain, never the
  // equipment chain that is its prefix — so iteration order is immaterial.
  for (const type of ENTITY_TYPES) {
    if (matchesDirChain(segments, ENTITY_DIR_SEGMENTS[type])) return type;
  }
  return null;
}

function matchesDirChain(
  segments: readonly string[],
  dirSegments: readonly string[],
): boolean {
  for (let i = 0; i + dirSegments.length < segments.length; i += 1) {
    const matches = dirSegments.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (matches && i + dirSegments.length === segments.length - 1) return true;
  }
  return false;
}
