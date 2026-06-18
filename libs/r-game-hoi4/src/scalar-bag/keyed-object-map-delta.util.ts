import { EntityBlockDelta, EntityField } from '@contracts';

import { computeScalarDelta } from './scalar-delta.util';

// One entry of an editable keyed-object map: its variable map `key` and the
// modeled scalar `rows` of its sub-block. The open-time snapshot and the edited
// values share this shape; the caller parses both from its own surfaces.
export interface KeyedMapEntry {
  readonly key: string;
  readonly rows: readonly EntityField[];
}

// Diffs an editable keyed-object map (e.g. ideology `types`) against its open-time
// snapshot, key-aware (ADR 018/019, amended ZMT-18). `scope` is the map block path
// (e.g. `['types']`). A surviving key's scalar rows diff one level deeper at
// `[...scope, key]`; a NEW key materializes its `<key> = { … }` sub-block there —
// with an empty `added` it materializes a bodyless `<key> = { }` (the write path's
// empty-block materialization). A key gone from the edited set is removed by a
// PARENT-scoped key removal (`{ block: scope, removed: [key] }`), dropping the
// whole sub-block; the emptied-block guard drops the map block if it empties. A
// rename is therefore remove-old-key + add-new-key, no key-mutation primitive.
// Keys not in the field template never enter `rows`, so they ride through lossless.
export function computeKeyedObjectMapDeltas(
  scope: readonly string[],
  snapshot: readonly KeyedMapEntry[],
  entries: readonly KeyedMapEntry[],
): EntityBlockDelta[] {
  const before = new Map(snapshot.map((entry) => [entry.key, entry.rows]));
  const seen = new Set<string>();
  const deltas: EntityBlockDelta[] = [];

  for (const entry of entries) {
    seen.add(entry.key);
    const beforeRows = before.get(entry.key);
    if (beforeRows === undefined) {
      // New (or renamed-to) key: one added-only delta materializing the entry's
      // sub-block. An empty `added` materializes the bodyless `<key> = { }`.
      deltas.push({
        added: [...entry.rows],
        block: [...scope, entry.key],
        changed: [],
        removed: [],
      });
      continue;
    }
    const delta = computeScalarDelta(beforeRows, entry.rows);
    if (!isEmptyDelta(delta))
      deltas.push({ block: [...scope, entry.key], ...delta });
  }

  for (const entry of snapshot) {
    if (seen.has(entry.key)) continue;
    deltas.push({
      added: [],
      block: [...scope],
      changed: [],
      removed: [entry.key],
    });
  }

  return deltas;
}

function isEmptyDelta(delta: {
  readonly added: readonly EntityField[];
  readonly changed: readonly EntityField[];
  readonly removed: readonly string[];
}): boolean {
  return (
    delta.added.length === 0 &&
    delta.changed.length === 0 &&
    delta.removed.length === 0
  );
}
