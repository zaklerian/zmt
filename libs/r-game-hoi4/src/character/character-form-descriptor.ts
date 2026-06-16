import { AppApiModel, CharacterEntity, GAME_IDS } from '@contracts';
import {
  defineEntityFormDescriptor,
  EntityFormBlock,
  EntityFormDescriptor,
  EntityFormModel,
  EntityFormProjectContext,
  EntityFormValues,
  ListOfScalarsBlock,
  NamedNestedBlock,
  PropertyBagBlock,
} from '@r-core';

import {
  CharacterBagSnapshot,
  CharacterListSnapshot,
  CharacterSnapshot,
  computeCharacterDeltas,
} from './character-delta.util';
import { CHARACTER_ENTITY_ID } from './character-entity-id.const';
import { characterErrorMessageKey } from './character-error.util';
import {
  GENDER_VALUES,
  KNOWN_PORTRAIT_KEYS,
  KNOWN_ROLE_KEYS,
} from './known-character-keys.const';

const PORTRAITS_BLOCK = 'portraits';
const TRAITS_BLOCK = 'traits';
const ROOT_KEYS: readonly string[] = ['name', 'gender'];

const traitsBinding = (roleId: string): string => `${roleId}__${TRAITS_BLOCK}`;

function project(
  entity: CharacterEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { gender, name, portraits, roles, token } = entity;

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: [
        {
          label: translate('plugin.hoi4:character.form.fields.name'),
          spec: 'name',
          value: name,
        },
        {
          label: translate('plugin.hoi4:character.form.fields.gender'),
          spec: { name: 'gender', validation: { enum: GENDER_VALUES } },
          value: gender,
        },
      ],
      mode: 'fixed',
    },
    scope: null,
  };

  const blocks: EntityFormBlock[] = [root];
  const bags: CharacterBagSnapshot[] = [];
  const lists: CharacterListSnapshot[] = [];

  if (portraits.length > 0) {
    const portraitsBlock: NamedNestedBlock = {
      kind: 'namedNested',
      knownKeys: [],
      name: PORTRAITS_BLOCK,
      namedChildren: portraits.map((group) => ({
        knownKeys: KNOWN_PORTRAIT_KEYS,
        name: group.group,
        rows: group.rows,
        scope: [PORTRAITS_BLOCK, group.group],
        sectionLabel: translate(
          `plugin.hoi4:character.form.portraits.${group.group}`,
        ),
      })),
      rows: [],
      scope: [PORTRAITS_BLOCK],
      sectionLabel: translate('plugin.hoi4:character.form.portraits.title'),
    };
    blocks.push(portraitsBlock);
    for (const group of portraits) {
      bags.push({
        binding: group.group,
        rows: group.rows,
        scope: [PORTRAITS_BLOCK, group.group],
      });
    }
  }

  for (const role of roles) {
    const traits: ListOfScalarsBlock = {
      kind: 'listOfScalars',
      label: translate('plugin.hoi4:character.form.traits'),
      name: traitsBinding(role.id),
      scope: [role.id, TRAITS_BLOCK],
      values: role.traits,
    };
    const roleBlock: NamedNestedBlock = {
      kind: 'namedNested',
      knownKeys: KNOWN_ROLE_KEYS[role.id],
      listChildren: [traits],
      name: role.id,
      rows: role.scalars,
      scope: [role.id],
      sectionLabel: translate(`plugin.hoi4:character.form.roles.${role.id}`),
    };
    blocks.push(roleBlock);
    bags.push({ binding: role.id, rows: role.scalars, scope: [role.id] });
    lists.push({
      binding: traitsBinding(role.id),
      scope: [role.id, TRAITS_BLOCK],
      values: role.traits,
    });
  }

  const rootScalars = ROOT_KEYS.map((key) => ({
    key,
    value: key === 'name' ? name : gender,
  })).filter((row) => row.value !== '');

  const snapshot: CharacterSnapshot = {
    bags,
    lists,
    root: rootScalars,
    rootKeys: ROOT_KEYS,
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeCharacterDeltas(snapshot, values);
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({ deltas, entityName: token, modId, relativePath });
  };

  return {
    blocks,
    dialogTitle: token,
    errorMessage: (code) => translate(characterErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:character.errors.title'),
    save,
  };
}

export const CHARACTER_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<CharacterEntity>({
    entityId: CHARACTER_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
