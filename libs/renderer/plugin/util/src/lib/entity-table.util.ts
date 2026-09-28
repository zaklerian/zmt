import type {
  EntityAction,
  EntityActionAvailability,
  EntityActionView,
} from './entity-action.model';
import type { EntityRow, EntitySortKey } from './entity-table.model';

export function sortEntityRows(
  rows: readonly EntityRow[],
  sortKeys: readonly EntitySortKey[],
): readonly EntityRow[] {
  if (sortKeys.length === 0) {
    return rows;
  }
  return [...rows].sort((left, right) => {
    for (const { columnId, direction } of sortKeys) {
      const factor = direction === 'asc' ? 1 : -1;
      const compared = (left.cells[columnId] ?? '').localeCompare(right.cells[columnId] ?? '');
      if (compared !== 0) {
        return compared * factor;
      }
    }
    return 0;
  });
}

export function toEntityActionViews(
  actions: readonly EntityAction[],
  availability: EntityActionAvailability,
): readonly EntityActionView[] {
  return actions.map((action) => ({
    available: action.isAvailable(availability),
    id: action.id,
    label: action.label,
  }));
}
