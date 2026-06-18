import { GAME_IDS, IdeologyEntity } from '@contracts';
import { Action, EntityToolbarContext } from '@r-core';

import { IDEOLOGY_ENTITY_ID } from './ideology-entity-id.const';

const EDIT = 'plugin.hoi4:ideology.actions.edit';

export function buildIdeologyActions(
  entitiesById: ReadonlyMap<string, IdeologyEntity>,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): IdeologyEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const hasSelection = (context: EntityToolbarContext): boolean =>
    selectedEntity(context) !== undefined;

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, IDEOLOGY_ENTITY_ID, entity);
  };

  return [
    {
      execute: openEditForm,
      id: 'hoi4-ideology-edit',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => EDIT,
    },
  ];
}
