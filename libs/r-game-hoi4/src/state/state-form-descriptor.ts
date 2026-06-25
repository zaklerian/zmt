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
  namedNestedRowsBinding,
  PropertyBagBlock,
} from '@r-core';

import {
  KNOWN_BUILDING_KEYS,
  KNOWN_HISTORY_KEYS,
  KNOWN_PROVINCE_BUILDING_KEYS,
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
    provinceBuildings,
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

  // `buildings` co-populates the state-wide building scalar `rows` AND an editable
  // keyed-object map of the per-province building objects (ZMT-E16, reusing the
  // ZMT-E15 keyed-map prop-bag entry). Each province entry is a prop-bag of open
  // building keys (freeSolo suggestions, free-text numeric values — the building set
  // is cross-entity, not enumerable here, R-CODE-5), written to
  // `['buildings', '<provinceId>']`. The rows bind to the sibling field-array; the
  // province entries keep the block-name binding (namedNestedRowsBinding).
  const buildingsBlock: NamedNestedBlock = {
    editableKeyedMap: {
      addLabel: translate('plugin.hoi4:state.form.buildings.add'),
      entryValue: { kind: 'prop-bag', knownKeys: KNOWN_PROVINCE_BUILDING_KEYS },
      keyLabel: translate('plugin.hoi4:state.form.buildings.key'),
    },
    kind: 'namedNested',
    knownKeys: KNOWN_BUILDING_KEYS,
    name: BUILDINGS_BLOCK,
    namedChildren: provinceBuildings.map((province) => ({
      knownKeys: KNOWN_PROVINCE_BUILDING_KEYS,
      name: province.id,
      rows: province.rows,
      scope: [BUILDINGS_BLOCK, province.id],
    })),
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
      {
        binding: namedNestedRowsBinding(buildingsBlock),
        rows: buildings,
        scope: [BUILDINGS_BLOCK],
      },
      { binding: HISTORY_BLOCK, rows: history, scope: [HISTORY_BLOCK] },
    ],
    lists: [
      { binding: PROVINCES_BLOCK, scope: [PROVINCES_BLOCK], values: provinces },
    ],
    provinceBuildings: provinceBuildings.map((province) => ({
      key: province.id,
      rows: province.rows,
    })),
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
