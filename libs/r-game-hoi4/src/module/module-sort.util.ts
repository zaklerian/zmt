import { ModuleDomain, ModuleEntity } from '@contracts';

// Localized domain text does not sort into the desired order, so precedence is
// encoded explicitly: air floats first, then naval, land, then unclassified.
// Ties break by category, then by name.
const DOMAIN_RANK: Record<ModuleDomain, number> = {
  air: 0,
  land: 2,
  naval: 1,
  unclassified: 3,
};

export function compareModuleEntities(
  a: ModuleEntity,
  b: ModuleEntity,
): number {
  const byRank = DOMAIN_RANK[a.domain] - DOMAIN_RANK[b.domain];
  if (byRank !== 0) return byRank;
  const byCategory = a.category.localeCompare(b.category);
  return byCategory === 0 ? a.name.localeCompare(b.name) : byCategory;
}
