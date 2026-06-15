import {
  AppApiModel,
  GAME_IDS,
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  ModuleEntity,
} from '@contracts';
import { Action, EntityToolbarContext, TranslateFn } from '@r-core';

import { MODULE_ENTITY_ID } from './module-entity-id.const';
import { moduleErrorMessageKey } from './module-error.util';

const DELETE = 'plugin.hoi4:module.actions.delete';
const EDIT = 'plugin.hoi4:module.actions.edit';

export function buildModuleActions(
  entitiesById: ReadonlyMap<string, ModuleEntity>,
  translate: TranslateFn,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): ModuleEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const hasSelection = (context: EntityToolbarContext): boolean =>
    selectedEntity(context) !== undefined;

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, MODULE_ENTITY_ID, entity);
  };

  const deleteEntity = async (context: EntityToolbarContext): Promise<void> => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    const proceed = await context.modal.confirm({
      confirmLabel: translate('plugin.hoi4:module.delete.confirm'),
      // TranslateFn carries no interpolation channel; the {name} token is the
      // module's own identifier, filled here after translation.
      message: translate('plugin.hoi4:module.delete.message').replace(
        '{name}',
        entity.name,
      ),
      title: translate('plugin.hoi4:module.delete.title'),
    });
    if (!proceed) return;
    try {
      const { api } = window as unknown as { readonly api: AppApiModel };
      await api.entity.delete({
        entityName: entity.name,
        modId: context.modId,
        relativePath: context.relativePath,
      });
      context.refresh();
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: IPC_ERROR_CODES.INTERNAL, message: String(rawError) };
      await context.modal.info({
        message: translate(moduleErrorMessageKey(error.code)),
        title: translate('plugin.hoi4:module.errors.title'),
      });
    }
  };

  return [
    {
      execute: openEditForm,
      id: 'hoi4-module-edit',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => EDIT,
    },
    {
      execute: deleteEntity,
      id: 'hoi4-module-delete',
      isAvailable: (context) => context.writable && hasSelection(context),
      label: () => DELETE,
    },
  ];
}
