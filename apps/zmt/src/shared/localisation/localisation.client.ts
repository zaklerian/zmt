import type { LocalisationLookupResult } from '@contracts';

// The typed renderer-side client over the `localisation:lookup` channel. Thin by
// design, exactly like `entityIndexClient` (ADR 024 decision 4): it wraps the one
// read channel and nothing more. Loc WRITES are deliberately absent — they ride
// `entity:writeBatch` so they stay atomic with the script edit they accompany
// (ADR 028 decision 1), and a second write path would be the partial-write hazard
// that boundary exists to remove.
export function lookupLocalisation(
  keys: readonly string[],
): Promise<LocalisationLookupResult> {
  return window.api.localisation.lookup(keys);
}
