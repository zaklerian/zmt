import { EntityScalarDelta, EquipmentScalar } from '@contracts';

export interface ScalarRow {
  readonly key: string;
  readonly value: string;
}

// Diffs the edited rows against the snapshot taken when the form opened. Keys
// present only after the edit are added; keys gone after the edit are removed;
// keys in both whose value moved are changed. Row keys are assumed normalized
// and unique by the caller (form validation guarantees both before save).
export function computeScalarDelta(
  snapshot: readonly EquipmentScalar[],
  rows: readonly ScalarRow[],
): EntityScalarDelta {
  const before = new Map(snapshot.map((scalar) => [scalar.key, scalar.value]));
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
