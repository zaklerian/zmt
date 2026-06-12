import type { EquipmentDomain } from '@contracts';

export interface ArchetypeDomainSlots {
  readonly categories: readonly string[];
  readonly domain: EquipmentDomain;
}

// A category seen under two different domains is ambiguous: it is marked
// conflicted and stays conflicted regardless of any later same-domain
// agreement. The sentinel keeps that state distinct from "not yet seen"
// (absent key) and from a settled domain, and never escapes the function — the
// returned map excludes every conflicted entry.
const CONFLICTED = Symbol('conflicted-domain');

export function deriveModuleDomains(
  input: ReadonlyArray<ArchetypeDomainSlots>,
): ReadonlyMap<string, EquipmentDomain> {
  const accumulator = new Map<string, EquipmentDomain | typeof CONFLICTED>();
  for (const { categories, domain } of input) {
    for (const category of categories) {
      const existing = accumulator.get(category);
      if (existing === undefined) {
        accumulator.set(category, domain);
      } else if (existing !== CONFLICTED && existing !== domain) {
        accumulator.set(category, CONFLICTED);
      }
    }
  }

  const index = new Map<string, EquipmentDomain>();
  for (const [category, domain] of accumulator) {
    if (domain !== CONFLICTED) {
      index.set(category, domain);
    }
  }
  return index;
}
