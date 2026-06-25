import { EntityBlockDelta, EntityField, EntityScalarDelta } from '@contracts';
import { KEYED_MAP_ENTRY_KEY, KEYED_MAP_ENTRY_ROWS } from '@r-core';

import {
  computeKeyedObjectMapDeltas,
  computeScalarDelta,
  KeyedMapEntry,
} from '../scalar-bag';

const DYNAMIC_FACTION_NAMES_BLOCK = 'dynamic_faction_names';
const TYPES_BLOCK = 'types';

// The open-time snapshot the save diffs against. `root` is the ideology's own
// modeled root scalars; `rootKeys` the fixed root field names; `dynamicFactionNames`
// the bare-token faction-name list; `types` the keyed-map entries (one per
// subideology, each its open modifier prop-bag rows).
export interface IdeologySnapshot {
  readonly dynamicFactionNames: readonly string[];
  readonly root: readonly EntityField[];
  readonly rootKeys: readonly string[];
  readonly types: readonly KeyedMapEntry[];
}

// Diffs every projected surface against its open-time snapshot and collects the
// non-empty path-scoped deltas (ADR 019, amended ZMT-18). Root scalars target
// `block: null`; `dynamic_faction_names` tokens lower to bare value-list items at
// `['dynamic_faction_names']`; the `types` keyed-object map diffs key-aware at
// `['types']` (a new subideology materializes `<key> = { … }`, an empty one
// `<key> = { }`; a removed one is dropped by a parent-scoped key removal; a rename
// is remove-old + add-new). Everything unmodeled — `color`, `rules`, `modifiers`,
// `ai_*`, and per-subideology unmodeled keys — never enters a delta, so it rides
// through a save byte-identical (R-CODE-5).
export function computeIdeologyDeltas(
  snapshot: IdeologySnapshot,
  values: Readonly<Record<string, unknown>>,
): EntityBlockDelta[] {
  const deltas: EntityBlockDelta[] = [];

  const rootRows = snapshot.rootKeys
    .map((key) => ({ key, value: stringValue(values[key]) }))
    .filter((row) => row.value !== '');
  const rootDelta = computeScalarDelta(snapshot.root, rootRows);
  if (!isEmptyDelta(rootDelta)) deltas.push({ block: null, ...rootDelta });

  const tokens = normalizeTokens(tokensOf(values[DYNAMIC_FACTION_NAMES_BLOCK]));
  const listDelta = computeScalarDelta(
    asBareRows(snapshot.dynamicFactionNames),
    asBareRows(tokens),
  );
  if (!isEmptyDelta(listDelta)) {
    deltas.push({ block: [DYNAMIC_FACTION_NAMES_BLOCK], ...listDelta });
  }

  const entries = entriesOf(values[TYPES_BLOCK]);
  deltas.push(
    ...computeKeyedObjectMapDeltas([TYPES_BLOCK], snapshot.types, entries),
  );

  return deltas;
}

// A bare value-list token carries no value: the absent value (null) signals the
// resolver to write the token alone, without an `= value` (A-TS-1).
function asBareRows(tokens: readonly string[]): readonly EntityField[] {
  return tokens.map((token) => ({ key: token, value: null }));
}

// The prop-bag rows of one keyed-map entry: each `{ key, value }` row with a
// trimmed non-empty key, deduped key-first (form validation guarantees
// non-empty/unique by save; this is the defensive parse). The value keeps its
// edited string so an unchanged row diffs to nothing against the snapshot, and a
// bodyless `<key> = { }` survives when an entry has no rows.
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

// Parses the keyed-map field-array into entries: each record's reserved map key
// (trimmed; empty-key rows dropped — form validation guarantees non-empty/unique
// by save) plus its open prop-bag rows (ZMT-E15).
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

function normalizeTokens(tokens: readonly string[]): readonly string[] {
  return tokens.map((token) => token.trim()).filter((token) => token !== '');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function tokensOf(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((token): token is string => typeof token === 'string');
}
