import { GAME_IDS, TechnologyEntity } from '@contracts';
import { Action, EntityToolbarContext } from '@r-core';

import { TECHNOLOGY_ENTITY_ID } from './technology-entity-id.const';

const EDIT = 'plugin.hoi4:technology.actions.edit';

export function buildTechnologyActions(
  entitiesById: ReadonlyMap<string, TechnologyEntity>,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): TechnologyEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const hasSelection = (context: EntityToolbarContext): boolean =>
    selectedEntity(context) !== undefined;

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, TECHNOLOGY_ENTITY_ID, entity);
  };

  return [
    {
      execute: openEditForm,
      id: 'hoi4-technology-edit',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => EDIT,
    },
  ];
}
