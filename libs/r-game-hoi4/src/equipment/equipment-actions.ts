import {
  AppApiModel,
  EquipmentEntity,
  GAME_IDS,
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
} from '@contracts';
import { Action, EntityToolbarContext, TranslateFn } from '@r-core';
import { createElement } from 'react';

import { EQUIPMENT_ENTITY_ID } from './equipment-entity-id.const';
import { equipmentErrorMessageKey } from './equipment-error.util';
import { SlotDesigner } from './slot-designer.component';

const ADD = 'plugin.hoi4:equipment.actions.add';
const DELETE = 'plugin.hoi4:equipment.actions.delete';
const DESIGN_MODULES = 'plugin.hoi4:equipment.actions.designModules';
const EDIT = 'plugin.hoi4:equipment.actions.edit';

// Add still has no insert contract (entity:write is an update path); its stub
// stays until that backend lands (ZMT-7.3 out of scope).
const noop = (): void => undefined;

export function buildEquipmentActions(
  entitiesById: ReadonlyMap<string, EquipmentEntity>,
  translate: TranslateFn,
): readonly Action<EntityToolbarContext>[] {
  const selectedEntity = (
    context: EntityToolbarContext,
  ): EquipmentEntity | undefined =>
    context.selectedRowId === null
      ? undefined
      : entitiesById.get(context.selectedRowId);

  const selectedIsClassifiedAir = (context: EntityToolbarContext): boolean => {
    const entity = selectedEntity(context);
    if (entity === undefined) return false;
    const { classification } = entity;
    return (
      classification.status === 'classified' && classification.domain === 'air'
    );
  };

  // Only archetypes define module_slots, so the designer is archetype-only on
  // top of the classified-air gate the edit form already requires.
  const selectedIsAirArchetype = (context: EntityToolbarContext): boolean => {
    const entity = selectedEntity(context);
    return entity?.kind === 'archetype' && selectedIsClassifiedAir(context);
  };

  const openDesigner = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentForm(
      createElement(SlotDesigner, {
        entity,
        modal: context.modal,
        modId: context.modId,
        onClose: context.dismissForm,
        onSaved: context.refresh,
        relativePath: context.relativePath,
      }),
    );
  };

  const openEditForm = (context: EntityToolbarContext): void => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    context.presentEntityForm(GAME_IDS.hoi4, EQUIPMENT_ENTITY_ID, entity);
  };

  const deleteEntity = async (context: EntityToolbarContext): Promise<void> => {
    const entity = selectedEntity(context);
    if (entity === undefined || context.modId === null) return;
    const proceed = await context.modal.confirm({
      confirmLabel: translate('plugin.hoi4:equipment.delete.confirm'),
      // TranslateFn carries no interpolation channel; the {name} token is the
      // entity's own identifier, filled here after translation.
      message: translate('plugin.hoi4:equipment.delete.message').replace(
        '{name}',
        entity.name,
      ),
      title: translate('plugin.hoi4:equipment.delete.title'),
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
        message: translate(equipmentErrorMessageKey(error.code)),
        title: translate('plugin.hoi4:equipment.errors.title'),
      });
    }
  };

  return [
    {
      execute: noop,
      id: 'hoi4-equipment-add',
      isAvailable: (context) => context.writable,
      label: () => ADD,
    },
    {
      execute: openEditForm,
      id: 'hoi4-equipment-edit',
      isAvailable: (context) =>
        context.writable && selectedIsClassifiedAir(context),
      label: () => EDIT,
    },
    {
      execute: openDesigner,
      id: 'hoi4-equipment-design-modules',
      isAvailable: (context) =>
        context.writable && selectedIsAirArchetype(context),
      label: () => DESIGN_MODULES,
    },
    {
      execute: deleteEntity,
      id: 'hoi4-equipment-delete',
      isAvailable: (context) =>
        context.writable && context.selectedRowId !== null,
      label: () => DELETE,
    },
  ];
}
