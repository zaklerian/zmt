import { EquipmentEntity } from '@contracts';
import { Action, EntityToolbarContext } from '@r-recognizer';

const ADD = 'plugin.hoi4:equipment.actions.add';
const DELETE = 'plugin.hoi4:equipment.actions.delete';
const EDIT = 'plugin.hoi4:equipment.actions.edit';

// Enablement is the deliverable this PR. The air-entity form (Add/Edit) and an
// entity-level write surface (Delete) land later; equipment:list is the only
// backend, so there is no write path to wire and execute stays a no-op.
const noop = (): void => undefined;

export function buildEquipmentActions(
  entitiesById: ReadonlyMap<string, EquipmentEntity>,
): readonly Action<EntityToolbarContext>[] {
  const selectedIsClassifiedAir = (context: EntityToolbarContext): boolean => {
    if (context.selectedRowId === null) return false;
    const entity = entitiesById.get(context.selectedRowId);
    if (entity === undefined) return false;
    const { classification } = entity;
    return (
      classification.status === 'classified' && classification.domain === 'air'
    );
  };

  return [
    {
      execute: noop,
      id: 'hoi4-equipment-add',
      isAvailable: (context) => context.writable,
      label: () => ADD,
    },
    {
      execute: noop,
      id: 'hoi4-equipment-edit',
      isAvailable: (context) =>
        context.writable && selectedIsClassifiedAir(context),
      label: () => EDIT,
    },
    {
      execute: noop,
      id: 'hoi4-equipment-delete',
      isAvailable: (context) =>
        context.writable && context.selectedRowId !== null,
      label: () => DELETE,
    },
  ];
}
