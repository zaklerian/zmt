import { AppApiModel, EquipmentEntity, GAME_IDS } from '@contracts';
import {
  defineEntityFormDescriptor,
  EntityFormDescriptor,
  EntityFormModel,
  EntityFormProjectContext,
  EntityFormValues,
} from '@r-core';

import {
  KNOWN_MODULE_KEYS,
  KNOWN_MODULE_STAT_KEYS,
} from '../module/known-module-keys.const';
import { computeScalarDelta, ScalarRow } from '../scalar-bag';
import { EQUIPMENT_ENTITY_ID } from './equipment-entity-id.const';
import { equipmentErrorMessageKey } from './equipment-error.util';
import { KNOWN_AIR_EQUIPMENT_KEYS } from './known-air-equipment-keys.const';

// Combobox suggestions over the static known set (planes + modules) — a deduped
// alphabetical union; the key control stays free-text, so nothing here narrows
// the keys a plane may carry.
const KNOWN_PLANE_FORM_KEYS: readonly string[] = [
  ...new Set([
    ...KNOWN_AIR_EQUIPMENT_KEYS,
    ...KNOWN_MODULE_KEYS,
    ...KNOWN_MODULE_STAT_KEYS,
  ]),
].sort((a, b) => a.localeCompare(b));

function project(
  entity: EquipmentEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { classification, kind, name, scalars } = entity;

  const kindLabel = translate(`plugin.hoi4:equipment.kind.${kind}`);
  const note =
    classification.status === 'classified'
      ? `${kindLabel} · ${translate(
          `plugin.hoi4:equipment.domain.${classification.domain}`,
        )}`
      : kindLabel;

  const save = async (values: EntityFormValues): Promise<void> => {
    const rows = (
      values as { readonly scalars: readonly ScalarRow[] }
    ).scalars.map((row) => ({ key: row.key.trim(), value: row.value }));
    const delta = computeScalarDelta(scalars, rows);
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({
      deltas: [{ block: null, ...delta }],
      entityName: name,
      modId,
      relativePath,
    });
  };

  return {
    // `name` is read-only — surfaced in the dialog title, never an editable field.
    blocks: [
      {
        kind: 'propertyBag',
        members: {
          knownKeys: KNOWN_PLANE_FORM_KEYS,
          mode: 'open',
          name: 'scalars',
          rows: scalars,
        },
        scope: null,
      },
    ],
    dialogTitle: name,
    errorMessage: (code) => translate(equipmentErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:equipment.errors.title'),
    note,
    save,
  };
}

export const PLANE_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<EquipmentEntity>({
    entityId: EQUIPMENT_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
