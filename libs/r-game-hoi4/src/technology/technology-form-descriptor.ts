import {
  AppApiModel,
  EntityBatchOperation,
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
import {
  computeTechnologyLocPlan,
  technologyPublicName,
} from './technology-loc-delta.util';

const PATH_BLOCK = 'path';
const FOLDER_BLOCK = 'folder';
const POSITION_BLOCK = 'position';

// The RHF binding of the public-name field. Reserved (double-underscore) so it
// can never collide with a modeled root scalar key, and so `computeTechnologyDeltas`
// — which reads only the declared `rootKeys` — cannot mistake it for a script field.
// The name is a LOCALISATION value, not a script field: it is the first field on
// this form whose write lands in another file and another format (ADR 028 D3).
const PUBLIC_NAME_FIELD = '__publicName';

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
  { localisation, modId, relativePath, translate }: EntityFormProjectContext,
): EntityFormModel {
  const { folders, paths, rootScalars, token } = entity;

  // The localised display name at open time. Absent context = the form was opened
  // from the ML file view, which resolves no localisation; the field is then not
  // rendered at all rather than rendered empty and silently unwritable.
  const openTimePublicName =
    localisation === undefined
      ? null
      : technologyPublicName(localisation, token);

  const root: PropertyBagBlock = {
    kind: 'propertyBag',
    members: {
      fields: [
        ...(openTimePublicName === null
          ? []
          : [
              {
                label: translate(
                  'plugin.hoi4:technology.form.fields.publicName',
                ),
                spec: { name: PUBLIC_NAME_FIELD },
                value: openTimePublicName,
              },
            ]),
        ...TECHNOLOGY_ROOT_SPECS.map((spec) => ({
          label: translate(
            `plugin.hoi4:technology.form.fields.${fieldName(spec)}`,
          ),
          spec,
          value: valueOf(rootScalars, fieldName(spec)),
        })),
      ],
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

  // The localisation half of the save (ADR 028 decisions 3 and 4). Empty when the
  // form carries no loc context or the public name is unchanged.
  const locPlanFor = (values: EntityFormValues) =>
    localisation === undefined || openTimePublicName === null
      ? { movedKeys: [], operations: [] }
      : computeTechnologyLocPlan(
          { context: localisation, token },
          stringAt(values, PUBLIC_NAME_FIELD),
          openTimePublicName,
        );

  // The write is now an ADR 027 CROSS-FILE BATCH, not a single-file write (ADR 028
  // decision 1): the technology `.txt` script delta and the localisation `.yml`
  // delta commit all-or-nothing, so a rename can never leave the two disagreeing.
  // The script operation carries exactly the delta `api.entity.write` carried, so
  // its `.txt` output is byte-identical for the same script edit.
  const save = async (values: EntityFormValues): Promise<void> => {
    const deltas = computeTechnologyDeltas(snapshot, values);
    const plan = locPlanFor(values);
    const script: readonly EntityBatchOperation[] =
      deltas.length === 0 && plan.renameTo === undefined
        ? []
        : [
            {
              deltas,
              entityName: token,
              format: 'script',
              modId,
              relativePath,
              ...(plan.renameTo === undefined
                ? {}
                : { renameTo: plan.renameTo }),
            },
          ];
    const operations = [...script, ...plan.operations];
    if (operations.length === 0) return;
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.writeBatch({ operations });
  };

  // Two save-time gates, both of which name what the save would overwrite rather
  // than doing it silently:
  //   1. ADR 022 decision 6 — a field bound to a `@NAME` substitution constant that
  //      this edit replaces with a literal, breaking the binding at that call site.
  //      UNCHANGED by this ticket; the loc field is not a script field.
  //   2. ZMT-50 — an autogenerated token regenerating. The block is renamed and its
  //      loc keys move, but references to the old token elsewhere in the corpus are
  //      NOT rewritten: that cascade is the move-entity operation ADR 027 decision 4
  //      leaves unblocked but not closed (ledger L-011).
  // Both can fire on ONE save (a rename that also literalizes a `@NAME` field), and
  // the shell shows a single confirm, so the messages are concatenated rather than
  // one silently pre-empting the other — suppressing either would drop a warning
  // the user is owed.
  const confirmBeforeSave = (
    values: EntityFormValues,
  ): ModalConfirmOptions | null => {
    const messages: string[] = [];
    const rename = locPlanFor(values).renameTo;
    if (rename !== undefined) {
      messages.push(
        `${translate('plugin.hoi4:technology.renameWarning.message')} ${token} → ${rename}`,
      );
    }
    const replacements = collectSymbolReplacements(snapshot, values);
    if (replacements.length > 0) {
      const list = replacements
        .map((replacement) => `@${replacement.name} → ${replacement.literal}`)
        .join(', ');
      messages.push(
        `${translate('plugin.hoi4:technology.symbolWarning.message')} ${list}`,
      );
    }
    if (messages.length === 0) return null;
    return {
      cancelLabel: translate('plugin.hoi4:technology.symbolWarning.cancel'),
      confirmLabel: translate('plugin.hoi4:technology.symbolWarning.confirm'),
      message: messages.join(' '),
      title: translate(
        rename === undefined
          ? 'plugin.hoi4:technology.symbolWarning.title'
          : 'plugin.hoi4:technology.renameWarning.title',
      ),
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

function stringAt(values: EntityFormValues, key: string): string {
  const value = values[key];
  return typeof value === 'string' ? value : '';
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
