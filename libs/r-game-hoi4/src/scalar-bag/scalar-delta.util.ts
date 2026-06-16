import { EntityField, EntityScalarDelta } from '@contracts';

// Diffs the edited rows against the snapshot taken when the bag opened. Keys
// present only after the edit are added; keys gone after the edit are removed;
// keys in both whose value moved are changed. Row keys are assumed normalized
// and unique by the caller (form validation guarantees both before save). Rows
// are `EntityField`s so a bare value-list token (absent value, null) diffs
// through the same path as a `key = value` scalar (A-TS-1).
export function computeScalarDelta(
  snapshot: readonly EntityField[],
  rows: readonly EntityField[],
): EntityScalarDelta {
  const before = new Map(snapshot.map((field) => [field.key, field.value]));
  const after = new Map(rows.map((row) => [row.key, row.value]));

  return {
    added: [...after]
      .filter(([key]) => !before.has(key))
      .map(([key, value]) => ({ key, value })),
    changed: [...after]
      .filter(([key, value]) => before.has(key) && before.get(key) !== value)
      .map(([key, value]) => ({ key, value })),
    removed: [...before.keys()].filter((key) => !after.has(key)),
  };
}
