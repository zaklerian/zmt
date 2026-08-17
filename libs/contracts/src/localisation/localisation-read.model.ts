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
  // The loc file an INSERT lands in when a key has no existing owner. This is the
  // ADR 028 decision 6 seam: a `resolveWriteTarget` / save-target preference
  // replaces it later, which is why it is resolved here and passed through as a
  // value rather than hardcoded at the composer. Null when the workspace has no
  // editable localisation file at all.
  readonly defaultTarget: LocWriteTarget | null;
  readonly entries: readonly LocalisationEntry[];
}

// A writable localisation file, addressed the way every other write in the app is
// addressed: the owning mod plus a mod-relative path (never an absolute path from
// the renderer).
export interface LocWriteTarget {
  readonly modId: ModId;
  readonly relativePath: string;
}
