import type { ModId } from '../workspace';

// One resolved localisation key: its current value plus the file that owns it.
// `target` is what a `set` / `delete` writes to; `permission` says whether that
// file may be written at all (a key whose only definition is in vanilla resolves
// `readonly`, and editing it is a loc create-override — deferred with the rest of
// ADR 027 decision 5's create-override routing).
export interface LocalisationEntry {
  readonly key: string;
  readonly permission: 'editable' | 'readonly';
  // Null when the winning definition lives in a source with no mod identity (the
  // vanilla game folder): there is nothing there we may write, so a rename of such
  // a key is an INSERT into `defaultTarget`, not a `set` — the localisation form of
  // the create-override ADR 027 decision 5 designs.
  readonly target: LocWriteTarget | null;
  readonly value: string;
  // The numeric version suffix as text ('' when the key is versionless).
  readonly version: string;
}

// `localisation:lookup(keys)` result. `entries` carries only the keys that
// resolved; an absent key means no source defines it (the common case for a base
// air technology, whose name lives in vanilla — ZMT-50 grounding §4).
export interface LocalisationLookupResult {
  // The loc file an INSERT lands in when a key has no existing owner. The ADR 028
  // decision 6 seam, now CLOSED (ZMT-57): it is `resolveWriteTarget('locKey', …)`
  // over the derived default below, so a user-chosen save target replaces it and an
  // unset one leaves it byte-identical to ZMT-50. Null when the workspace has no
  // editable localisation file at all.
  readonly defaultTarget: LocWriteTarget | null;
  // Non-null exactly when `defaultTarget` is the USER'S chosen save target rather
  // than the derived default: the write must pair a create-if-absent `locCreate`
  // seeded in this language with its content operation, because a target the user
  // named may not exist yet (ADR 029 decision 3). Null for the derived default,
  // which is by construction a file that already exists — which is what keeps the
  // unset path's batch shape unchanged (ADR 029 decision 5).
  readonly defaultTargetSeedLanguage: null | string;
  readonly entries: readonly LocalisationEntry[];
}

// A writable localisation file, addressed the way every other write in the app is
// addressed: the owning mod plus a mod-relative path (never an absolute path from
// the renderer).
export interface LocWriteTarget {
  readonly modId: ModId;
  readonly relativePath: string;
}
