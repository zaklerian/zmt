import { EntityBlockDelta, EntityField, EntityScalarDelta } from '@contracts';
import { KEYED_MAP_ENTRY_KEY, KEYED_MAP_ENTRY_ROWS } from '@r-core';

import {
  computeKeyedObjectMapDeltas,
  computeScalarDelta,
  KeyedMapEntry,
  ScalarRow,
} from '../scalar-bag';

const BUILDINGS_BLOCK = 'buildings';

// One key→scalar sub-bag of the state form: its open-time rows, the RHF
// field-array it binds to, and the entity:write scope path it targets. Covers the
// resources / history named-nested maps and the state-wide buildings rows (whose
// binding is the keyed-map sibling, namedNestedRowsBinding).
export interface StateBagSnapshot {
  readonly binding: string;
  readonly rows: readonly EntityField[];
  readonly scope: readonly string[];
}

// One bare-token value list (the state's `provinces`): its open-time tokens, RHF
// binding, and scope path.
export interface StateListSnapshot {
  readonly binding: string;
  readonly scope: readonly string[];
  readonly values: readonly string[];
}

// The open-time snapshot the save diffs against. `root` is the entity's own root
// scalar fields; `rootKeys` are the fixed root field names (bound flat, not as a
// field-array); `bags` are the resources / state-wide buildings / history maps;
// `lists` are the province id tokens; `provinceBuildings` are the per-province
// building keyed-map entries (one per province id, each its open building prop-bag).
export interface StateSnapshot {
  readonly bags: readonly StateBagSnapshot[];
  readonly lists: readonly StateListSnapshot[];
  readonly provinceBuildings: readonly KeyedMapEntry[];
  readonly root: readonly EntityField[];
  readonly rootKeys: readonly string[];
}

// Diffs every projected surface against its open-time snapshot and collects the
// non-empty path-scoped deltas (ADR 019, amended ZMT-13/14/15, ZMT-E16). Root scalars
// target `block: null`; the maps target their child paths; the per-province building
// objects diff key-aware at `['buildings']` (a new province materializes
// `<id> = { … }`, a removed one is dropped by a parent-scoped key removal, a building
// row diffs one level deeper at `['buildings', '<id>']`); province tokens lower to
// bare value-list items (absent value, null) at `['provinces']`. The state-wide
// building rows and the province sub-blocks coexist under one `buildings` block — the
// handler coalesces an added-only state-wide row and an added-only province entry into
// one materialized block when `buildings` is absent (ZMT-15.1). Block existence is the
// handler's call (create on first add, drop when emptied), so only per-block
// adds/changes/removes are sent here.
export function computeStateDeltas(
  snapshot: StateSnapshot,
  values: Readonly<Record<string, unknown>>,
): EntityBlockDelta[] {
  const deltas: EntityBlockDelta[] = [];

  const rootRows = snapshot.rootKeys
    .map((key) => ({ key, value: stringValue(values[key]) }))
    .filter((row) => row.value !== '');
  const rootDelta = computeScalarDelta(snapshot.root, rootRows);
  if (!isEmptyDelta(rootDelta)) deltas.push({ block: null, ...rootDelta });

  for (const bag of snapshot.bags) {
    const rows = normalizeRows(rowsOf(values[bag.binding]));
    const delta = computeScalarDelta(bag.rows, rows);
    if (!isEmptyDelta(delta)) deltas.push({ block: bag.scope, ...delta });
  }

  for (const list of snapshot.lists) {
    const tokens = normalizeTokens(tokensOf(values[list.binding]));
    const delta = computeScalarDelta(
      asBareRows(list.values),
      asBareRows(tokens),
    );
    if (!isEmptyDelta(delta)) deltas.push({ block: list.scope, ...delta });
  }

  const entries = entriesOf(values[BUILDINGS_BLOCK]);
  deltas.push(
    ...computeKeyedObjectMapDeltas(
      [BUILDINGS_BLOCK],
      snapshot.provinceBuildings,
      entries,
    ),
  );

  return deltas;
}

// A bare value-list token carries no value: the absent value (null) is the
// resolver's signal to write the token alone, without an `= value` (A-TS-1).
function asBareRows(tokens: readonly string[]): readonly EntityField[] {
  return tokens.map((token) => ({ key: token, value: null }));
}

// The building rows of one province keyed-map entry: each `{ key, value }` row with
// a trimmed non-empty key, deduped key-first (form validation guarantees
// non-empty/unique by save; this is the defensive parse). The value keeps its edited
// string so an unchanged row diffs to nothing, and a bodyless `<id> = { }` survives
// when a province has no buildings.
function bagRows(value: unknown): readonly EntityField[] {
  if (!Array.isArray(value)) return [];
  const rows: EntityField[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const record = raw as Record<string, unknown>;
    const key = stringValue(record.key).trim();
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, value: stringValue(record.value).trim() });
  }
  return rows;
}

// Parses the per-province building field-array into keyed-map entries: each record's
// reserved map key (the province id, trimmed; empty-key rows dropped — form
// validation guarantees non-empty/unique by save) plus its open building prop-bag
// rows (ZMT-E16, reusing the ZMT-E15 keyed-map prop-bag parse).
function entriesOf(value: unknown): readonly KeyedMapEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: KeyedMapEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const record = raw as Record<string, unknown>;
    const key = stringValue(record[KEYED_MAP_ENTRY_KEY]).trim();
    if (key === '') continue;
    entries.push({ key, rows: bagRows(record[KEYED_MAP_ENTRY_ROWS]) });
  }
  return entries;
}

function isEmptyDelta(delta: EntityScalarDelta): boolean {
  return (
    delta.added.length === 0 &&
    delta.changed.length === 0 &&
    delta.removed.length === 0
  );
}

function normalizeRows(rows: readonly ScalarRow[]): readonly ScalarRow[] {
  return rows
    .map((row) => ({ key: row.key.trim(), value: row.value }))
    .filter((row) => row.value !== '');
}

function normalizeTokens(tokens: readonly string[]): readonly string[] {
  return tokens.map((token) => token.trim()).filter((token) => token !== '');
}

function rowsOf(value: unknown): readonly ScalarRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is ScalarRow =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as ScalarRow).key === 'string' &&
      typeof (row as ScalarRow).value === 'string',
  );
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function tokensOf(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((token): token is string => typeof token === 'string');
}
