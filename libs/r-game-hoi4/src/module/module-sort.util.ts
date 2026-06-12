import { ModuleEntity } from '@contracts';

// Modules carry no domain; order by category, then by name within a category.
export function compareModuleEntities(
  a: ModuleEntity,
  b: ModuleEntity,
): number {
  const byCategory = a.category.localeCompare(b.category);
  return byCategory === 0 ? a.name.localeCompare(b.name) : byCategory;
}
