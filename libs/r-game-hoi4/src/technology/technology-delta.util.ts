import {
  EntityBlockDelta,
  EntityBlockScopeSegment,
  EntityField,
  EntityScalarDelta,
} from '@contracts';
import { OBJECT_LIST_ITEM_INDEX_KEY } from '@r-core';

import { computeScalarDelta } from '../scalar-bag';

// One bare-token ref-list (e.g. `dependencies`): its open-time tokens, RHF
// binding, and one-element scope path.
export interface TechnologyListSnapshot {
  readonly binding: string;
  readonly scope: readonly string[];
  readonly values: readonly string[];
}

export interface TechnologyObjectListItem {
  readonly nested?: readonly EntityField[];
  readonly scalars: readonly EntityField[];
}

// One object-list block (`path` / `folder`): its block name (= RHF binding and
// scope segment name), the scalar field keys each item carries, the optional
// nested object's name and field keys, and the open-time items in source order.
export interface TechnologyObjectListSnapshot {
  readonly fieldKeys: readonly string[];
  readonly items: readonly TechnologyObjectListItem[];
  readonly name: string;
  readonly nested?: {
    readonly fieldKeys: readonly string[];
    readonly name: string;
  };
}

// The open-time snapshot the save diffs against. `root` is the entity's own
// scalar fields; `rootKeys` the modeled root field names; `lists` the ref-lists;
// `objectLists` the `path`/`folder` repeated-block lists.
export interface TechnologySnapshot {
  readonly lists: readonly TechnologyListSnapshot[];
  readonly objectLists: readonly TechnologyObjectListSnapshot[];
  readonly root: readonly EntityField[];
  readonly rootKeys: readonly string[];
}

// Diffs every projected surface against its open-time snapshot and collects the
// non-empty path-scoped deltas. Root scalars target `block: null`; ref-list tokens
// lower to bare value-list items at a one-element path; object-list items address
// the index-th repeated same-name block via an indexed scope segment (ADR 019,
// amended ZMT-14). An existing item's scalars and nested object are patched
// item-surgically; a removed item drops its whole block (emptied-block guard); a
// new item materializes one fresh block including its inline nested object.
export function computeTechnologyDeltas(
  snapshot: TechnologySnapshot,
  values: Readonly<Record<string, unknown>>,
): EntityBlockDelta[] {
  const deltas: EntityBlockDelta[] = [];

  const rootRows = snapshot.rootKeys
    .map((key) => ({ key, value: stringValue(values[key]) }))
    .filter((row) => row.value !== '');
  const rootDelta = computeScalarDelta(snapshot.root, rootRows);
  if (!isEmptyDelta(rootDelta)) deltas.push({ block: null, ...rootDelta });

  for (const list of snapshot.lists) {
    const tokens = normalizeTokens(tokensOf(values[list.binding]));
    const delta = computeScalarDelta(
      asBareRows(list.values),
      asBareRows(tokens),
    );
    if (!isEmptyDelta(delta)) deltas.push({ block: list.scope, ...delta });
  }

  for (const objectList of snapshot.objectLists) {
    deltas.push(
      ...objectListDeltas(objectList, itemsOf(values[objectList.name])),
    );
  }

  return deltas;
}

// A bare value-list token carries no value: the absent value (null) signals the
// resolver to write the token alone, without an `= value` (A-TS-1).
function asBareRows(tokens: readonly string[]): readonly EntityField[] {
  return tokens.map((token) => ({ key: token, value: null }));
}

// The inline-rendered nested object value for a new item's materialization, e.g.
// `{ x = 0 y = 0 }`. The resolver's object-block renderer emits it as the item's
// `position = { … }` field; absent when no nested field has a value.
function inlineObject(fields: readonly EntityField[]): null | string {
  if (fields.length === 0) return null;
  const body = fields.map((field) => `${field.key} = ${field.value ?? ''}`);
  return `{ ${body.join(' ')} }`;
}

function isEmptyDelta(delta: EntityScalarDelta): boolean {
  return (
    delta.added.length === 0 &&
    delta.changed.length === 0 &&
    delta.removed.length === 0
  );
}

// The scalar rows of one form item, keyed by the modeled field keys, trimmed and
// with empties dropped (an empty value means the key is absent).
function itemRows(
  item: Record<string, unknown>,
  keys: readonly string[],
): readonly EntityField[] {
  const rows: EntityField[] = [];
  for (const key of keys) {
    const value = stringValue(item[key]).trim();
    if (value !== '') rows.push({ key, value });
  }
  return rows;
}

function itemsOf(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null,
  );
}

function nestedOf(
  item: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  const value = item[name];
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeTokens(tokens: readonly string[]): readonly string[] {
  return tokens.map((token) => token.trim()).filter((token) => token !== '');
}

function objectListDeltas(
  objectList: TechnologyObjectListSnapshot,
  items: readonly Record<string, unknown>[],
): EntityBlockDelta[] {
  const deltas: EntityBlockDelta[] = [];
  const surviving = new Set<number>();
  let nextNewIndex = objectList.items.length;

  for (const item of items) {
    const originalIndex = item[OBJECT_LIST_ITEM_INDEX_KEY];
    const scalars = itemRows(item, objectList.fieldKeys);
    const nested =
      objectList.nested === undefined
        ? []
        : itemRows(
            nestedOf(item, objectList.nested.name),
            objectList.nested.fieldKeys,
          );

    if (typeof originalIndex !== 'number') {
      // New item: materialize one fresh block, nested object inline.
      const added = [...scalars];
      const inline = inlineObject(nested);
      if (objectList.nested !== undefined && inline !== null) {
        added.push({ key: objectList.nested.name, value: inline });
      }
      if (added.length > 0) {
        deltas.push({
          added,
          block: segment(objectList.name, nextNewIndex),
          changed: [],
          removed: [],
        });
      }
      nextNewIndex += 1;
      continue;
    }

    surviving.add(originalIndex);
    const snapshotItem = objectList.items[originalIndex];
    if (snapshotItem === undefined) continue;

    const scalarDelta = computeScalarDelta(snapshotItem.scalars, scalars);
    if (!isEmptyDelta(scalarDelta)) {
      deltas.push({
        block: segment(objectList.name, originalIndex),
        ...scalarDelta,
      });
    }
    if (objectList.nested !== undefined) {
      const nestedDelta = computeScalarDelta(snapshotItem.nested ?? [], nested);
      if (!isEmptyDelta(nestedDelta)) {
        deltas.push({
          block: [
            { index: originalIndex, name: objectList.name },
            objectList.nested.name,
          ],
          ...nestedDelta,
        });
      }
    }
  }

  // Removed items: drop the whole source block by removing every modeled child
  // (the emptied-block guard then deletes the block).
  objectList.items.forEach((snapshotItem, index) => {
    if (surviving.has(index)) return;
    const removed = snapshotItem.scalars.map((field) => field.key);
    if (
      objectList.nested !== undefined &&
      (snapshotItem.nested ?? []).length > 0
    ) {
      removed.push(objectList.nested.name);
    }
    if (removed.length > 0) {
      deltas.push({
        added: [],
        block: segment(objectList.name, index),
        changed: [],
        removed,
      });
    }
  });

  return deltas;
}

function segment(
  name: string,
  index: number,
): readonly EntityBlockScopeSegment[] {
  return [{ index, name }];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function tokensOf(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((token): token is string => typeof token === 'string');
}
