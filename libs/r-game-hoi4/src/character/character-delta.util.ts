import { EntityBlockDelta, EntityField, EntityScalarDelta } from '@contracts';

import { computeScalarDelta, ScalarRow } from '../scalar-bag';

// One key→scalar sub-bag of the character form: its open-time rows, the RHF
// field-array it binds to, and the entity:write scope path it targets.
export interface CharacterBagSnapshot {
  readonly binding: string;
  readonly rows: readonly EntityField[];
  readonly scope: readonly string[];
}

// One bare-token value list (a role's `traits`): its open-time tokens, RHF
// binding, and scope path.
export interface CharacterListSnapshot {
  readonly binding: string;
  readonly scope: readonly string[];
  readonly values: readonly string[];
}

// The open-time snapshot the save diffs against. `root` is the entity's own
// scalar fields; `rootKeys` are the fixed root field names (bound flat, not as a
// field-array); `bags` are the portrait groups and role scalar blocks; `lists`
// are the role trait lists.
export interface CharacterSnapshot {
  readonly bags: readonly CharacterBagSnapshot[];
  readonly lists: readonly CharacterListSnapshot[];
  readonly root: readonly EntityField[];
  readonly rootKeys: readonly string[];
}

// Diffs every projected surface against its open-time snapshot and collects the
// non-empty path-scoped deltas (ADR 019, amended ZMT-13). Root scalars target
// `block: null`; portrait groups and roles target their child paths; trait
// tokens lower to bare value-list items (empty value) at a two-element path.
// Block existence is the handler's call — it creates a block on first add and
// drops it when emptied — so only per-block adds/changes/removes are sent here.
export function computeCharacterDeltas(
  snapshot: CharacterSnapshot,
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

// A bare value-list token carries no value: the empty value is the resolver's
// signal to write the token alone, without an `= value`.
function asBareRows(tokens: readonly string[]): readonly ScalarRow[] {
  return tokens.map((token) => ({ key: token, value: '' }));
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
