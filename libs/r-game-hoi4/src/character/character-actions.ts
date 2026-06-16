import { CharacterEntity, GAME_IDS } from '@contracts';
import { Action, EntityToolbarContext } from '@r-core';

import { CHARACTER_ENTITY_ID } from './character-entity-id.const';

const EDIT = 'plugin.hoi4:character.actions.edit';

export function buildCharacterActions(
  entitiesById: ReadonlyMap<string, CharacterEntity>,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): CharacterEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const hasSelection = (context: EntityToolbarContext): boolean =>
    selectedEntity(context) !== undefined;

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, CHARACTER_ENTITY_ID, entity);
  };

  return [
    {
      execute: openEditForm,
      id: 'hoi4-character-edit',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => EDIT,
    },
  ];
}
