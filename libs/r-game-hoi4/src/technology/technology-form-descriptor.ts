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
  buildTechnologyAddOperations,
  resolveTechnologyAddToken,
} from './technology-add.util';
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

// The RHF binding of the token field, rendered on the ADD path only. Reserved the
// same way and for the same reason as the public-name field: it is the entity's
// IDENTITY, not one of its script scalars, and `computeTechnologyDeltas` must not
// mistake it for one. On the edit path the token is frozen (ZMT-50 review
// Q89/Q90), so the field does not exist there at all.
const TOKEN_FIELD = '__token';

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

// `originalIndex` null marks an item that does not exist in the source yet — the
// ADD path, where every projected item (the seeded `folder` and `path`) is a NEW
// object-list item. Omitting the index key is exactly the signal
// `computeTechnologyDeltas` reads to materialize a fresh block instead of patching
// the index-th existing one.
function itemRecord(
  scalars: readonly EntityField[],
  originalIndex: null | number,
  nested?: { readonly fields: readonly EntityField[]; readonly name: string },
): Readonly<Record<string, unknown>> {
  const record: Record<string, unknown> =
    originalIndex === null
      ? {}
      : { [OBJECT_LIST_ITEM_INDEX_KEY]: originalIndex };
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
  {
    localisation,
    mode,
    modId,
    relativePath,
    seedRelativePath,
    translate,
  }: EntityFormProjectContext,
): EntityFormModel {
  const { folders, paths, rootScalars, token } = entity;

  // ADR 028 decision 5: the SAME form, projected in add mode. The subject is a
  // blank technology the caller seeded with its placement (folder + position), the
  // open-time snapshot is empty so every value saves as an addition, and the write
  // is an INSERT batch rather than a patch batch.
  const isAdd = mode === 'add';

  // The localised display name at open time. Absent context = the form was opened
  // from the ML file view, which resolves no localisation; the field is then not
  // rendered at all rather than rendered empty and silently unwritable. On add
  // there is nothing to look up — a token that does not exist yet owns no key.
  const openTimePublicName =
    localisation === undefined
      ? null
      : isAdd
        ? ''
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
        ...(isAdd
          ? [
              {
                label: translate('plugin.hoi4:technology.form.fields.token'),
                spec: { name: TOKEN_FIELD },
                value: '',
              },
            ]
          : []),
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
    items: paths.map((path, index) =>
      itemRecord(path.scalars, isAdd ? null : index),
    ),
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
      itemRecord(folder.scalars, isAdd ? null : index, {
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

  // On add the snapshot is BLANK while the blocks still render the seeded values,
  // so `computeTechnologyDeltas` compiles every value — seeded or typed — as an
  // addition. That all-added delta set is exactly what the AST insert reads as the
  // new block's body (ADR 027 decision 4), so the create path reuses the edit
  // path's delta machinery instead of a parallel builder.
  const snapshot: TechnologySnapshot = {
    lists: isAdd ? lists.map((list) => ({ ...list, values: [] })) : lists,
    objectLists: isAdd
      ? objectLists.map((objectList) => ({ ...objectList, items: [] }))
      : objectLists,
    root: isAdd ? [] : rootScalars,
    rootKeys: TECHNOLOGY_ROOT_SPECS.map(fieldName),
  };

  // The localisation half of the save (ADR 028 decision 3). Empty when the form
  // carries no loc context or the public name is unchanged.
  const locPlanFor = (values: EntityFormValues) =>
    localisation === undefined || openTimePublicName === null
      ? { operations: [] }
      : computeTechnologyLocPlan(
          { context: localisation, token },
          stringAt(values, PUBLIC_NAME_FIELD),
          openTimePublicName,
        );

  // The write is an ADR 027 CROSS-FILE BATCH, not a single-file write (ADR 028
  // decision 1): the technology `.txt` script delta and the localisation `.yml`
  // delta commit all-or-nothing, so a public-name edit can never leave the two
  // disagreeing. The script operation carries exactly the delta `api.entity.write`
  // carried, so its `.txt` output is byte-identical for the same script edit — and
  // it NEVER carries `renameTo`: the token is frozen on the edit path (ZMT-50
  // review Q89/Q90; the plan type has no rename field to pass through).
  //
  // The ADD write (ADR 028 decision 5) is the same batch carrying an INSERT of the
  // new block plus the insert of its loc name key. Its token is derived HERE, at
  // save, not at open — the user may still be typing the public name the
  // autogenerated token comes from, and a cleared token field means "autogenerate
  // from what I finally typed".
  const addOperations = (
    values: EntityFormValues,
  ): readonly EntityBatchOperation[] => {
    const publicName = stringAt(values, PUBLIC_NAME_FIELD);
    return buildTechnologyAddOperations({
      body: computeTechnologyDeltas(snapshot, values),
      localisation,
      publicName,
      // ZMT-57: the add target is `resolveWriteTarget('technology', …)`'s answer,
      // and when that is the user's chosen file the insert carries its
      // create-if-absent seed. The EDIT path never seeds — it patches a block whose
      // file, by definition, already owns it (ADR 029 decision 2).
      seedTarget: seedRelativePath === true,
      target: { modId, relativePath },
      token: resolveTechnologyAddToken(
        stringAt(values, TOKEN_FIELD),
        publicName,
        localisation?.takenIds ?? [],
      ),
    });
  };

  const editOperations = (
    values: EntityFormValues,
  ): readonly EntityBatchOperation[] => {
    const deltas = computeTechnologyDeltas(snapshot, values);
    const script: readonly EntityBatchOperation[] =
      deltas.length === 0
        ? []
        : [
            {
              deltas,
              entityName: token,
              format: 'script',
              modId,
              relativePath,
            },
          ];
    return [...script, ...locPlanFor(values).operations];
  };

  const save = async (values: EntityFormValues): Promise<void> => {
    const operations = isAdd ? addOperations(values) : editOperations(values);
    if (operations.length === 0) return;
    const { api } = window as unknown as { readonly api: AppApiModel };
    await api.entity.writeBatch({ operations });
  };

  // The one save-time gate, unchanged by this ticket: ADR 022 decision 6 — a field
  // bound to a `@NAME` substitution constant that this edit replaces with a
  // literal, breaking the binding at that call site. The public-name field is not a
  // script field, so it never triggers this; and with the token frozen there is no
  // rename to confirm.
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
    dialogTitle: isAdd
      ? translate('plugin.hoi4:technology.form.addTitle')
      : token,
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
