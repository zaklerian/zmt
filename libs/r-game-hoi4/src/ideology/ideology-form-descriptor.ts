import { AppApiModel, EntityField, GAME_IDS, IdeologyEntity } from '@contracts';
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
  PropertyBagBlock,
} from '@r-core';

import { computeIdeologyDeltas, IdeologySnapshot } from './ideology-delta.util';
import { IDEOLOGY_ENTITY_ID } from './ideology-entity-id.const';
import { ideologyErrorMessageKey } from './ideology-error.util';
import {
  IDEOLOGY_ROOT_SPECS,
  KNOWN_IDEOLOGY_RULES_KEYS,
} from './known-ideology-keys.const';

const DYNAMIC_FACTION_NAMES_BLOCK = 'dynamic_faction_names';
const FACTION_MODIFIERS_BLOCK = 'faction_modifiers';
const MODIFIERS_BLOCK = 'modifiers';
const RULES_BLOCK = 'rules';
const TYPES_BLOCK = 'types';

function project(
  entity: IdeologyEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const {
    dynamicFactionNames,
    factionModifiers,
    modifiers,
    rootScalars,
    rules,
    token,
    types,
  } = entity;

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: IDEOLOGY_ROOT_SPECS.map((spec) => ({
        label: translate(`plugin.hoi4:ideology.form.fields.${fieldName(spec)}`),
        spec,
        value: valueOf(rootScalars, fieldName(spec)),
      })),
      mode: 'fixed',
    },
    scope: null,
  };

  // `rules` is the finite known-key boolean block: an open prop-bag over the
  // boolean suggestion keys (yes/no value selects on a match) yet freeSolo so an
  // unlisted rule key still round-trips (ZMT-E19).
  const rulesBlock: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      knownKeys: KNOWN_IDEOLOGY_RULES_KEYS,
      mode: 'open',
      name: RULES_BLOCK,
      rows: rules,
    },
    scope: [RULES_BLOCK],
    sectionLabel: translate('plugin.hoi4:ideology.form.rules.title'),
  };

  // `modifiers` / `faction_modifiers` are open modifier-name → number maps with no
  // enumerable key set — open prop-bags (no known keys). Modeled as a property bag
  // rather than a named-nested block so an empty `faction_modifiers` still renders
  // its add affordance (ZMT-E19).
  const modifiersBlock: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      knownKeys: [],
      mode: 'open',
      name: MODIFIERS_BLOCK,
      rows: modifiers,
    },
    scope: [MODIFIERS_BLOCK],
    sectionLabel: translate('plugin.hoi4:ideology.form.modifiers.title'),
  };

  const factionModifiersBlock: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      knownKeys: [],
      mode: 'open',
      name: FACTION_MODIFIERS_BLOCK,
      rows: factionModifiers,
    },
    scope: [FACTION_MODIFIERS_BLOCK],
    sectionLabel: translate('plugin.hoi4:ideology.form.factionModifiers.title'),
  };

  const dynamicFactionNamesBlock: ListOfScalarsBlock = {
    kind: 'listOfScalars',
    label: translate('plugin.hoi4:ideology.form.dynamicFactionNames.label'),
    name: DYNAMIC_FACTION_NAMES_BLOCK,
    scope: [DYNAMIC_FACTION_NAMES_BLOCK],
    values: dynamicFactionNames,
  };

  // The editable keyed-object map: `types` is a variable-key map of subideologies,
  // each an open modifier prop-bag (ZMT-E15). The `namedChildren` carry the
  // read-side rows; `editableKeyedMap` switches the facet into add/remove/rename
  // mode with a prop-bag entry value (open keys, free-text numeric values — the
  // modifier set is ecosystem-defined, not enumerable here, R-CODE-5).
  const typesBlock: NamedNestedBlock = {
    editableKeyedMap: {
      addLabel: translate('plugin.hoi4:ideology.form.types.add'),
      entryValue: { kind: 'prop-bag', knownKeys: [] },
      keyLabel: translate('plugin.hoi4:ideology.form.types.key'),
    },
    kind: 'namedNested',
    knownKeys: [],
    name: TYPES_BLOCK,
    namedChildren: types.map((type) => ({
      knownKeys: [],
      name: type.key,
      rows: type.scalars,
      scope: [TYPES_BLOCK, type.key],
    })),
    rows: [],
    scope: [TYPES_BLOCK],
    sectionLabel: translate('plugin.hoi4:ideology.form.types.title'),
  };

  const blocks: EntityFormBlock[] = [
    root,
    rulesBlock,
    modifiersBlock,
    factionModifiersBlock,
    dynamicFactionNamesBlock,
    typesBlock,
  ];

  const snapshot: IdeologySnapshot = {
    dynamicFactionNames,
    factionModifiers,
    modifiers,
    root: rootScalars,
    rootKeys: IDEOLOGY_ROOT_SPECS.map(fieldName),
    rules,
    types: types.map((type) => ({ key: type.key, rows: type.scalars })),
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeIdeologyDeltas(snapshot, values);
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({ deltas, entityName: token, modId, relativePath });
  };

  return {
    blocks,
    dialogTitle: token,
    errorMessage: (code) => translate(ideologyErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:ideology.errors.title'),
    save,
  };
}

function valueOf(scalars: readonly EntityField[], key: string): string {
  const field = scalars.find((entry) => entry.key === key);
  return field?.value ?? '';
}

export const IDEOLOGY_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<IdeologyEntity>({
    entityId: IDEOLOGY_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
