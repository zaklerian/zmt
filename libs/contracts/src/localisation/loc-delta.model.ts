// The localisation (`.yml`) delta vocabulary of the write boundary (ADR 027
// decision 2). It lives in @contracts, not beside the main-side strategy, because
// the TL edit form composes loc deltas in the RENDERER and ships them over
// `entity:writeBatch` (ADR 028 decision 3) — a shape that crosses the wire is a
// cross-process identifier and states itself once (R-ELECTRON-2). The loc-lines
// strategy imports these; it does not redeclare them.
//
// `value` on set/insert is the INNER value written verbatim between the quotes —
// the composer owns any `\"` / `\n` / `§` escaping, mirroring the AST strategy's
// verbatim `EntityField.value`.

export interface LocDeleteDelta {
  readonly key: string;
  readonly kind: 'delete';
}

export type LocDelta = LocDeleteDelta | LocInsertDelta | LocSetDelta;

export interface LocInsertDelta {
  readonly key: string;
  readonly kind: 'insert';
  readonly value: string;
  // The numeric version suffix, as text: '0' is typical, '' is the versionless
  // `KEY: "value"` shape (both occur in BICE). A non-empty version emits `KEY:VER`.
  readonly version: string;
}

export interface LocSetDelta {
  readonly key: string;
  readonly kind: 'set';
  readonly value: string;
}
