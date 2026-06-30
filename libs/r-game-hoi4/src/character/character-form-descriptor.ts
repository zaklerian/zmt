import {
  AppApiModel,
  CharacterEntity,
  EntityBlockScopeSegment,
  GAME_IDS,
} from '@contracts';
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
  KNOWN_PORTRAIT_KEYS,
  KNOWN_ROLE_BAG_KEYS,
  KNOWN_ROLE_KEYS,
} from './known-character-keys.const';

const PORTRAITS_BLOCK = 'portraits';
const TRAITS_BLOCK = 'traits';
const ROOT_KEYS: readonly string[] = ['name'];

const traitsBinding = (roleId: string): string => `${roleId}__${TRAITS_BLOCK}`;

// An instance-nested role binds its RHF field-arrays under a per-instance prefix so
// two roles sharing an `id` across DLC wrappers (e.g. a `country_leader` in each
// `instance`) never collide in form state. The binding is renderer-only: the write
// targets `scope`, and display uses the section label. A top-level role's empty
// scope yields no prefix, leaving its bindings unchanged (ZMT-E21).
const bindingPrefix = (scope: readonly EntityBlockScopeSegment[]): string =>
  scope
    .map((segment) =>
      typeof segment === 'string'
        ? `${segment}__`
        : `${segment.name}_${segment.index}__`,
    )
    .join('');

function project(
  entity: CharacterEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { name, portraits, roles, token } = entity;

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: [
        {
          label: translate('plugin.hoi4:character.form.fields.name'),
          spec: 'name',
          value: name,
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
    // An instance-nested role carries an indexed `instance` scope prefix; a
    // top-level role's prefix is empty, leaving its paths unchanged (ZMT-E21).
    const roleScope = [...role.scope, role.id];
    const prefix = bindingPrefix(role.scope);
    const roleBinding = `${prefix}${role.id}`;
    const bagBinding = (name: string): string => `${prefix}${name}`;
    const traits: ListOfScalarsBlock = {
      kind: 'listOfScalars',
      label: translate('plugin.hoi4:character.form.traits'),
      name: traitsBinding(roleBinding),
      scope: [...roleScope, TRAITS_BLOCK],
      values: role.traits,
    };
    const roleBlock: NamedNestedBlock = {
      kind: 'namedNested',
      knownKeys: KNOWN_ROLE_KEYS[role.id],
      listChildren: [traits],
      name: roleBinding,
      namedChildren: role.bags.map((bag) => ({
        knownKeys: KNOWN_ROLE_BAG_KEYS[bag.name] ?? [],
        name: bagBinding(bag.name),
        rows: bag.rows,
        scope: [...roleScope, bag.name],
        sectionLabel: translate(
          `plugin.hoi4:character.form.roleBags.${bag.name}`,
        ),
      })),
      rows: role.scalars,
      scope: roleScope,
      sectionLabel: translate(`plugin.hoi4:character.form.roles.${role.id}`),
    };
    blocks.push(roleBlock);
    bags.push({ binding: roleBinding, rows: role.scalars, scope: roleScope });
    for (const bag of role.bags) {
      bags.push({
        binding: bagBinding(bag.name),
        rows: bag.rows,
        scope: [...roleScope, bag.name],
      });
    }
    lists.push({
      binding: traitsBinding(roleBinding),
      scope: [...roleScope, TRAITS_BLOCK],
      values: role.traits,
    });
  }

  const rootScalars = ROOT_KEYS.map((key) => ({ key, value: name })).filter(
    (row) => row.value !== '',
  );

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
