import type {
  TechnologyEntity,
  TechnologyNodeKind,
  TechnologyPosition,
  TechnologySlim,
} from '@contracts';

const LEADS_TO_TECH = 'leads_to_tech';
const POSITION_X = 'x';
const POSITION_Y = 'y';
const START_YEAR = 'start_year';

// The technology `slimProjector` (ADR 024 decision 4): the graph shape a canvas
// node and its edges need without an `index:detail` call — position, the two
// distinct edge lists, node kind, categories, start year. Provenance is NOT here;
// it rides the `IndexSlimRow` wrapper (the index attaches it from the resolved
// entity's provenance).
export function projectTechnologySlim(
  entity: TechnologyEntity,
): TechnologySlim {
  const position = positionOf(entity);
  return {
    categories: entity.categories,
    dependencyTargets: entity.dependencies,
    id: entity.token,
    nodeKind: nodeKindOf(entity, position),
    pathTargets: pathTargetsOf(entity),
    position,
    startYear: finiteNumberOrNull(
      entity.rootScalars.find((field) => field.key === START_YEAR)?.value,
    ),
  };
}

function finiteNumberOrNull(raw: null | string | undefined): null | number {
  if (raw === null || raw === undefined) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// Resolver-by-signal (ADR 024 / Q7), NOT a lookup of which tokens are referenced
// as sub-technologies: `sub` when the entity declares no own position (the engine
// attaches a sub-tech to its parent), else `wide` when it declares
// `enable_equipments`, else `simple`.
function nodeKindOf(
  entity: TechnologyEntity,
  position: null | TechnologyPosition,
): TechnologyNodeKind {
  if (position === null) {
    return 'sub';
  }
  return entity.enableEquipments.length > 0 ? 'wide' : 'simple';
}

// Every `path` block's `leads_to_tech` target, in source order — the drawn
// OR-edges. Distinct from `dependencies` (undrawn AND-edges), which the entity
// already carries flattened.
function pathTargetsOf(entity: TechnologyEntity): readonly string[] {
  const targets: string[] = [];
  for (const path of entity.paths) {
    const target = path.scalars.find((field) => field.key === LEADS_TO_TECH);
    if (target?.value !== null && target?.value !== undefined) {
      targets.push(target.value);
    }
  }
  return targets;
}

// The first folder's resolved x/y. Null when the entity declares no folder
// position, or when a coordinate is not a finite number (e.g. an unresolved
// `@`-var left as verbatim text) — a fabricated 0,0 is never invented (R-CODE-5).
// A null here is exactly the `sub` node signal.
function positionOf(entity: TechnologyEntity): null | TechnologyPosition {
  const fields = entity.folders[0]?.position;
  if (fields === undefined) {
    return null;
  }
  const x = finiteNumberOrNull(
    fields.find((field) => field.key === POSITION_X)?.value,
  );
  const y = finiteNumberOrNull(
    fields.find((field) => field.key === POSITION_Y)?.value,
  );
  return x === null || y === null ? null : { x, y };
}
