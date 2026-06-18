import { EntityBlockDelta, EntityField, EntityScalarDelta } from '@contracts';

import { computeScalarDelta, ScalarRow } from '../scalar-bag';

// One key→scalar sub-bag of the state form: its open-time rows, the RHF
// field-array it binds to, and the entity:write scope path it targets. Covers the
// resources / buildings / history named-nested maps and the naval_base depth-2
// map (scope `['buildings', 'naval_base']`).
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
// field-array); `bags` are the resources / buildings / naval_base / history maps;
// `lists` are the province id tokens.
export interface StateSnapshot {
  readonly bags: readonly StateBagSnapshot[];
  readonly lists: readonly StateListSnapshot[];
  readonly root: readonly EntityField[];
  readonly rootKeys: readonly string[];
}

// Diffs every projected surface against its open-time snapshot and collects the
// non-empty path-scoped deltas (ADR 019, amended ZMT-13/14/15). Root scalars
// target `block: null`; the maps target their child paths (naval_base at the
// two-element `['buildings', 'naval_base']`); province tokens lower to bare
// value-list items (absent value, null) at `['provinces']`. Block existence is
// the handler's call — it creates a block on first add (materializing absent
// intermediates for an added-only delta, ZMT-15) and drops it when emptied — so
// only per-block adds/changes/removes are sent here.
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

  return deltas;
}

// A bare value-list token carries no value: the absent value (null) is the
// resolver's signal to write the token alone, without an `= value` (A-TS-1).
function asBareRows(tokens: readonly string[]): readonly EntityField[] {
  return tokens.map((token) => ({ key: token, value: null }));
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
