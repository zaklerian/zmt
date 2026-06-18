import { AppApiModel, EntityField, GAME_IDS, StateEntity } from '@contracts';
import {
  defineEntityFormDescriptor,
  EntityFormBlock,
  EntityFormDescriptor,
  EntityFormModel,
  EntityFormProjectContext,
  EntityFormValues,
  fieldName,
  ListOfScalarsBlock,
  NamedNestedBlock,
  NamedScalarChild,
  PropertyBagBlock,
} from '@r-core';

import {
  KNOWN_BUILDING_KEYS,
  KNOWN_HISTORY_KEYS,
  KNOWN_RESOURCE_KEYS,
  STATE_ROOT_SPECS,
} from './known-state-keys.const';
import { computeStateDeltas, StateSnapshot } from './state-delta.util';
import { STATE_ENTITY_ID } from './state-entity-id.const';
import { stateErrorMessageKey } from './state-error.util';

// The entity block is the file's `state = { … }` block; the write path locates it
// by this name.
const STATE_BLOCK = 'state';
const BUILDINGS_BLOCK = 'buildings';
const HISTORY_BLOCK = 'history';
const NAVAL_BASE_BLOCK = 'naval_base';
const PROVINCES_BLOCK = 'provinces';
const RESOURCES_BLOCK = 'resources';

function project(
  entity: StateEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const {
    buildings,
    history,
    id,
    navalBase,
    provinces,
    resources,
    rootScalars,
  } = entity;

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: STATE_ROOT_SPECS.map((spec) => ({
        label: translate(`plugin.hoi4:state.form.fields.${fieldName(spec)}`),
        spec,
        value: valueOf(rootScalars, fieldName(spec)),
      })),
      mode: 'fixed',
    },
    scope: null,
  };

  const resourcesBlock: NamedNestedBlock = {
    kind: 'namedNested',
    knownKeys: KNOWN_RESOURCE_KEYS,
    name: RESOURCES_BLOCK,
    rows: resources,
    scope: [RESOURCES_BLOCK],
    sectionLabel: translate('plugin.hoi4:state.form.resources.title'),
  };

  // The naval_base depth-2 map: variable province-id keys (no suggestions),
  // written to `['buildings', 'naval_base']`. When `buildings` is absent the
  // write materializes it along the path (added-only, ZMT-15).
  const navalBaseChild: NamedScalarChild = {
    knownKeys: [],
    name: NAVAL_BASE_BLOCK,
    rows: navalBase,
    scope: [BUILDINGS_BLOCK, NAVAL_BASE_BLOCK],
    sectionLabel: translate('plugin.hoi4:state.form.navalBase.title'),
  };

  // First descriptor to co-populate `rows` (building → level) AND `namedChildren`
  // (the naval_base map) on one named-nested block.
  const buildingsBlock: NamedNestedBlock = {
    kind: 'namedNested',
    knownKeys: KNOWN_BUILDING_KEYS,
    name: BUILDINGS_BLOCK,
    namedChildren: [navalBaseChild],
    rows: buildings,
    scope: [BUILDINGS_BLOCK],
    sectionLabel: translate('plugin.hoi4:state.form.buildings.title'),
  };

  const historyBlock: NamedNestedBlock = {
    kind: 'namedNested',
    knownKeys: KNOWN_HISTORY_KEYS,
    name: HISTORY_BLOCK,
    rows: history,
    scope: [HISTORY_BLOCK],
    sectionLabel: translate('plugin.hoi4:state.form.history.title'),
  };

  const provincesBlock: ListOfScalarsBlock = {
    kind: 'listOfScalars',
    label: translate('plugin.hoi4:state.form.provinces.label'),
    name: PROVINCES_BLOCK,
    scope: [PROVINCES_BLOCK],
    values: provinces,
  };

  const blocks: EntityFormBlock[] = [
    root,
    resourcesBlock,
    buildingsBlock,
    historyBlock,
    provincesBlock,
  ];

  const snapshot: StateSnapshot = {
    bags: [
      { binding: RESOURCES_BLOCK, rows: resources, scope: [RESOURCES_BLOCK] },
      { binding: BUILDINGS_BLOCK, rows: buildings, scope: [BUILDINGS_BLOCK] },
      {
        binding: NAVAL_BASE_BLOCK,
        rows: navalBase,
        scope: [BUILDINGS_BLOCK, NAVAL_BASE_BLOCK],
      },
      { binding: HISTORY_BLOCK, rows: history, scope: [HISTORY_BLOCK] },
    ],
    lists: [
      { binding: PROVINCES_BLOCK, scope: [PROVINCES_BLOCK], values: provinces },
    ],
    root: rootScalars,
    rootKeys: STATE_ROOT_SPECS.map(fieldName),
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeStateDeltas(snapshot, values);
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({
      deltas,
      entityName: STATE_BLOCK,
      modId,
      relativePath,
    });
  };

  return {
    blocks,
    dialogTitle: id,
    errorMessage: (code) => translate(stateErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:state.errors.title'),
    save,
  };
}

function valueOf(scalars: readonly EntityField[], key: string): string {
  const field = scalars.find((entry) => entry.key === key);
  return field?.value ?? '';
}

export const STATE_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<StateEntity>({
    entityId: STATE_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
