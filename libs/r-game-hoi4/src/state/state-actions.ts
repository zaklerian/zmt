import { GAME_IDS, StateEntity } from '@contracts';
import { Action, EntityToolbarContext } from '@r-core';

import { STATE_ENTITY_ID } from './state-entity-id.const';

const EDIT = 'plugin.hoi4:state.actions.edit';

export function buildStateActions(
  entitiesById: ReadonlyMap<string, StateEntity>,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): StateEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const hasSelection = (context: EntityToolbarContext): boolean =>
    selectedEntity(context) !== undefined;

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, STATE_ENTITY_ID, entity);
  };

  return [
    {
      execute: openEditForm,
      id: 'hoi4-state-edit',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => EDIT,
    },
  ];
}
