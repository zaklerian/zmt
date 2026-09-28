import type {
  EditableKeyedMap,
  EntityFormBlock,
  EntityFormRow,
  NamedNestedBlock,
  NamedScalarChild,
} from './entity-form-block.model';
import type { EntityFormValues } from './entity-form.model';

export const KEYED_MAP_ENTRY_KEY = '__key';

export const KEYED_MAP_ENTRY_ROWS = '__rows';

export const NAMED_NESTED_ROWS_SUFFIX = '__rows';

export function blockKey(block: EntityFormBlock, index: number): string {
  switch (block.kind) {
    case 'listOfScalars':
    case 'namedNested':
    case 'objectList':
      return block.name;
    case 'propertyBag':
      return block.members.mode === 'open' ? block.members.name : `fixed-${String(index)}`;
    default:
      return block satisfies never;
  }
}

export function namedNestedRendersRows(block: NamedNestedBlock): boolean {
  return block.rows.length > 0 || block.knownKeys.length > 0;
}

export function namedNestedRowsBinding(block: NamedNestedBlock): string {
  return `${block.name}${NAMED_NESTED_ROWS_SUFFIX}`;
}

function toRow(row: EntityFormRow): EntityFormRow {
  return { key: row.key, value: row.value ?? '' };
}

function toKeyedEntry(child: NamedScalarChild, map: EditableKeyedMap): EntityFormValues {
  switch (map.entryValue.kind) {
    case 'fixedFields': {
      const fields = map.entryValue.fields.map((field): readonly [string, string] => [
        field.spec.name,
        child.rows.find((row) => row.key === field.spec.name)?.value ?? '',
      ]);
      return { [KEYED_MAP_ENTRY_KEY]: child.name, ...Object.fromEntries(fields) };
    }
    case 'propertyBag':
      return { [KEYED_MAP_ENTRY_KEY]: child.name, [KEYED_MAP_ENTRY_ROWS]: child.rows.map(toRow) };
    default:
      return map.entryValue satisfies never;
  }
}

function namedNestedDefaults(block: NamedNestedBlock): EntityFormValues {
  const lists = Object.fromEntries(
    (block.listChildren ?? []).map((child) => [child.name, [...child.values]]),
  );
  const map = block.editableKeyedMap;
  if (map !== undefined) {
    return {
      ...lists,
      ...(namedNestedRendersRows(block)
        ? { [namedNestedRowsBinding(block)]: block.rows.map(toRow) }
        : {}),
      [block.name]: (block.namedChildren ?? []).map((child) => toKeyedEntry(child, map)),
    };
  }
  return {
    ...lists,
    [block.name]: block.rows.map(toRow),
    ...Object.fromEntries(
      (block.namedChildren ?? []).map((child) => [child.name, child.rows.map(toRow)]),
    ),
  };
}

function blockDefaults(block: EntityFormBlock): EntityFormValues {
  switch (block.kind) {
    case 'listOfScalars':
      return { [block.name]: [...block.values] };
    case 'namedNested':
      return namedNestedDefaults(block);
    case 'objectList':
      return { [block.name]: block.items.map((item) => ({ ...item })) };
    case 'propertyBag':
      return block.members.mode === 'open'
        ? { [block.members.name]: block.members.rows.map(toRow) }
        : Object.fromEntries(block.members.fields.map((field) => [field.spec.name, field.value]));
    default:
      return block satisfies never;
  }
}

export function buildEntityFormDefaults(blocks: readonly EntityFormBlock[]): EntityFormValues {
  return blocks.reduce<EntityFormValues>(
    (values, block) => ({ ...values, ...blockDefaults(block) }),
    {},
  );
}
