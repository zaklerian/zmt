import {
  AppApiModel,
  EntityField,
  GAME_IDS,
  TechnologyEntity,
} from '@contracts';
import {
  defineEntityFormDescriptor,
  EntityFormBlock,
  EntityFormDescriptor,
  EntityFormModel,
  EntityFormProjectContext,
  EntityFormValues,
  fieldName,
  FieldSpec,
  ListOfScalarsBlock,
  ModalConfirmOptions,
  OBJECT_LIST_ITEM_INDEX_KEY,
  ObjectListBlock,
  ObjectListField,
  PropertyBagBlock,
  TranslateFn,
} from '@r-core';

import {
  TECHNOLOGY_FOLDER_SPECS,
  TECHNOLOGY_PATH_SPECS,
  TECHNOLOGY_POSITION_SPECS,
  TECHNOLOGY_REF_LISTS,
  TECHNOLOGY_ROOT_SPECS,
} from './known-technology-keys.const';
import {
  collectSymbolReplacements,
  computeTechnologyDeltas,
  TechnologyListSnapshot,
  TechnologyObjectListSnapshot,
  TechnologySnapshot,
} from './technology-delta.util';
import { TECHNOLOGY_ENTITY_ID } from './technology-entity-id.const';
import { technologyErrorMessageKey } from './technology-error.util';

const PATH_BLOCK = 'path';
const FOLDER_BLOCK = 'folder';
const POSITION_BLOCK = 'position';

function fieldsFromSpecs(
  specs: readonly FieldSpec[],
  group: string,
  translate: TranslateFn,
): readonly ObjectListField[] {
  return specs.map((spec) => ({
    label: translate(`plugin.hoi4:technology.form.${group}.${fieldName(spec)}`),
    spec,
  }));
}

function itemRecord(
  scalars: readonly EntityField[],
  originalIndex: number,
  nested?: { readonly fields: readonly EntityField[]; readonly name: string },
): Readonly<Record<string, unknown>> {
  const record: Record<string, unknown> = {
    [OBJECT_LIST_ITEM_INDEX_KEY]: originalIndex,
  };
  for (const field of scalars) record[field.key] = field.value ?? '';
  if (nested !== undefined) {
    const nestedValue: Record<string, unknown> = {};
    for (const field of nested.fields)
      nestedValue[field.key] = field.value ?? '';
    record[nested.name] = nestedValue;
  }
  return record;
}

function project(
  entity: TechnologyEntity,
  { modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { folders, paths, rootScalars, token } = entity;

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: TECHNOLOGY_ROOT_SPECS.map((spec) => ({
        label: translate(
          `plugin.hoi4:technology.form.fields.${fieldName(spec)}`,
        ),
        spec,
        value: valueOf(rootScalars, fieldName(spec)),
      })),
      mode: 'fixed',
    },
    scope: null,
  };

  const pathsBlock: ObjectListBlock = {
    addLabel: translate('plugin.hoi4:technology.form.path.add'),
    fields: fieldsFromSpecs(TECHNOLOGY_PATH_SPECS, PATH_BLOCK, translate),
    itemLabel: translate('plugin.hoi4:technology.form.path.item'),
    items: paths.map((path, index) => itemRecord(path.scalars, index)),
    kind: 'objectList',
    name: PATH_BLOCK,
    scope: null,
    sectionLabel: translate('plugin.hoi4:technology.form.path.title'),
  };

  const foldersBlock: ObjectListBlock = {
    addLabel: translate('plugin.hoi4:technology.form.folder.add'),
    fields: fieldsFromSpecs(TECHNOLOGY_FOLDER_SPECS, FOLDER_BLOCK, translate),
    itemLabel: translate('plugin.hoi4:technology.form.folder.item'),
    items: folders.map((folder, index) =>
      itemRecord(folder.scalars, index, {
        fields: folder.position,
        name: POSITION_BLOCK,
      }),
    ),
    kind: 'objectList',
    name: FOLDER_BLOCK,
    nested: {
      fields: fieldsFromSpecs(
        TECHNOLOGY_POSITION_SPECS,
        POSITION_BLOCK,
        translate,
      ),
      name: POSITION_BLOCK,
      sectionLabel: translate('plugin.hoi4:technology.form.position.title'),
    },
    scope: null,
    sectionLabel: translate('plugin.hoi4:technology.form.folder.title'),
  };

  const lists: TechnologyListSnapshot[] = [];
  const refListBlocks: ListOfScalarsBlock[] = TECHNOLOGY_REF_LISTS.map(
    (ref) => {
      lists.push({
        binding: ref.name,
        scope: [ref.name],
        values: entity[ref.entityKey],
      });
      return {
        kind: 'listOfScalars',
        label: translate(
          `plugin.hoi4:technology.form.refLists.${ref.entityKey}`,
        ),
        name: ref.name,
        scope: [ref.name],
        values: entity[ref.entityKey],
      } satisfies ListOfScalarsBlock;
    },
  );

  const blocks: EntityFormBlock[] = [
    root,
    pathsBlock,
    foldersBlock,
    ...refListBlocks,
  ];

  const objectLists: TechnologyObjectListSnapshot[] = [
    {
      fieldKeys: TECHNOLOGY_PATH_SPECS.map(fieldName),
      items: paths.map((path) => ({ scalars: path.scalars })),
      name: PATH_BLOCK,
    },
    {
      fieldKeys: TECHNOLOGY_FOLDER_SPECS.map(fieldName),
      items: folders.map((folder) => ({
        nested: folder.position,
        scalars: folder.scalars,
      })),
      name: FOLDER_BLOCK,
      nested: {
        fieldKeys: TECHNOLOGY_POSITION_SPECS.map(fieldName),
        name: POSITION_BLOCK,
      },
    },
  ];

  const snapshot: TechnologySnapshot = {
    lists,
    objectLists,
    root: rootScalars,
    rootKeys: TECHNOLOGY_ROOT_SPECS.map(fieldName),
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeTechnologyDeltas(snapshot, values);
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.write({ deltas, entityName: token, modId, relativePath });
  };

  // Changing a field bound to a `@NAME` substitution constant writes a literal
  // and breaks the binding at this call site — intended, but never silent (ADR
  // 022, decision 6). Names each replaced constant and its replacing literal.
  const confirmBeforeSave = (
    values: EntityFormValues,
  ): ModalConfirmOptions | null => {
    const replacements = collectSymbolReplacements(snapshot, values);
    if (replacements.length === 0) return null;
    const list = replacements
      .map((replacement) => `@${replacement.name} → ${replacement.literal}`)
      .join(', ');
    return {
      cancelLabel: translate('plugin.hoi4:technology.symbolWarning.cancel'),
      confirmLabel: translate('plugin.hoi4:technology.symbolWarning.confirm'),
      message: `${translate('plugin.hoi4:technology.symbolWarning.message')} ${list}`,
      title: translate('plugin.hoi4:technology.symbolWarning.title'),
    };
  };

  return {
    blocks,
    confirmBeforeSave,
    dialogTitle: token,
    errorMessage: (code) => translate(technologyErrorMessageKey(code)),
    errorTitle: translate('plugin.hoi4:technology.errors.title'),
    save,
  };
}

function valueOf(scalars: readonly EntityField[], key: string): string {
  const field = scalars.find((entry) => entry.key === key);
  return field?.value ?? '';
}

export const TECHNOLOGY_FORM_DESCRIPTOR: EntityFormDescriptor =
  defineEntityFormDescriptor<TechnologyEntity>({
    entityId: TECHNOLOGY_ENTITY_ID,
    gameId: GAME_IDS.hoi4,
    project,
  });
