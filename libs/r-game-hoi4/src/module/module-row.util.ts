import { ModuleDomain, ModuleEntity } from '@contracts';
import { EntityRow, TranslateFn } from '@r-core';

const DOMAIN_KEY: Record<ModuleDomain, string> = {
  air: 'plugin.hoi4:module.domain.air',
  land: 'plugin.hoi4:module.domain.land',
  naval: 'plugin.hoi4:module.domain.naval',
  unclassified: 'plugin.hoi4:module.domain.unclassified',
};

// Air is the only fully wired domain; naval and land are muted pending their
// forms (8.4) and unclassified is flagged as a warning that needs attention.
const ROW_STATE: Record<ModuleDomain, EntityRow['state']> = {
  air: 'normal',
  land: 'muted',
  naval: 'muted',
  unclassified: 'warning',
};

const EMPTY_CATEGORY = '—';

export function mapModuleRow(
  entity: ModuleEntity,
  translate: TranslateFn,
): EntityRow {
  return {
    cells: {
      category: entity.category === '' ? EMPTY_CATEGORY : entity.category,
      domain: translate(DOMAIN_KEY[entity.domain]),
      name: entity.name,
    },
    id: entity.name,
    state: ROW_STATE[entity.domain],
  };
}
