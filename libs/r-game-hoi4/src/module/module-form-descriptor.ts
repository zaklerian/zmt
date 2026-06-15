import { AppApiModel, GAME_IDS, ModuleEntity } from '@contracts';
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
} from './known-module-keys.const';
import {
  computeModuleDeltas,
  MODULE_STAT_BLOCKS,
  ModuleBagSnapshot,
  ModuleBagValues,
} from './module-delta.util';
import { MODULE_ENTITY_ID } from './module-entity-id.const';
import { moduleErrorMessageKey } from './module-error.util';

const SECTION_LABEL_KEYS: Readonly<Record<string, string>> = {
  add_average_stats: 'plugin.hoi4:module.form.sections.addAverageStats',
  add_stats: 'plugin.hoi4:module.form.sections.addStats',
  multiply_stats: 'plugin.hoi4:module.form.sections.multiplyStats',
};

function project(
  entity: ModuleEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { category, name, scalars, statBlocks } = entity;

  // Snapshot each bag at open so save diffs against the original projection.
  const snapshot: ModuleBagSnapshot = {
    add_average_stats: statBlocks.add_average_stats,
    add_stats: statBlocks.add_stats,
    multiply_stats: statBlocks.multiply_stats,
    scalars,
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeModuleDeltas(
      snapshot,
      values as unknown as ModuleBagValues,
    );
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({ deltas, entityName: name, modId, relativePath });
  };

  return {
    blocks: [
      {
        kind: 'propertyBag',
        members: {
          knownKeys: KNOWN_MODULE_KEYS,
          mode: 'open',
          name: 'scalars',
          rows: scalars,
        },
        scope: null,
        sectionLabel: translate('plugin.hoi4:module.form.sections.scalars'),
      },
      // One named-nested block per stat block; each a key→scalar map reusing
      // the property-bag rendering, written to its named child scope (ADR 019).
      // Every other nested block stays untouched in the lossless node (R-CODE-5).
      ...MODULE_STAT_BLOCKS.map((block) => ({
        kind: 'namedNested' as const,
        knownKeys: KNOWN_MODULE_STAT_KEYS,
        name: block,
        rows: statBlocks[block],
        scope: block,
        sectionLabel: translate(SECTION_LABEL_KEYS[block] ?? block),
      })),
    ],
    dialogTitle: name,
    errorMessage: (code) => translate(moduleErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:module.errors.title'),
    note: `${translate('plugin.hoi4:module.form.header.category')}: ${
      category === '' ? '—' : category
    }`,
    save,
  };
}

export const MODULE_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<ModuleEntity>({
    entityId: MODULE_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
