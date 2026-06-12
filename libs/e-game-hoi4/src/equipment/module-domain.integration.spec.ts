import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import type { ArchetypeDomainSlots } from './derive-module-domains.util';

import { extractModules } from '../module/extract-modules.util';
import { buildArchetypeIndex } from './build-archetype-index.util';
import { deriveModuleDomains } from './derive-module-domains.util';
import { extractEquipment } from './extract-equipment.util';
import { extractSlots } from './extract-slots.util';

// End-to-end regression for the ADR 017 → 018 path: a vanilla air archetype must
// classify (now from its `interface_category`, ADR 018), feed the module-domain
// index its slot categories (ADR 017), and so domain its modules. This is the
// reported "all vanilla modules unclassified" defect. It fails on the pre-fix
// code: `small_plane_airframe`'s `type` token was absent from the old
// type-keyed domain table, so the archetype never classified, the index stayed
// empty, and `plane_engine_type` resolved to `unclassified`.
const AIR_ARCHETYPE = `equipments = {
\tsmall_plane_airframe = {
\t\tis_archetype = yes
\t\tinterface_category = interface_category_air
\t\ttype = small_plane
\t\tmodule_slots = {
\t\t\tengine_type_slot = {
\t\t\t\tallowed_module_categories = {
\t\t\t\t\tplane_engine_type
\t\t\t\t\ttwin_plane_engine_type
\t\t\t\t}
\t\t\t}
\t\t}
\t}
}
`;

const ENGINE_MODULE = `equipment_modules = {
\tplane_engine_1 = {
\t\tcategory = plane_engine_type
\t}
}
`;

// Mirrors moduleDomainIndex (apps/electron) over the parsed equipment files.
function moduleDomainIndexFor(equipmentSource: string) {
  const parsed = parse(equipmentSource, { dialects: [] });
  const archetypeIndex = buildArchetypeIndex([parsed]);
  return deriveModuleDomains(
    extractEquipment(parsed, archetypeIndex).flatMap((entity) => {
      if (entity.classification.status !== 'classified') {
        return [];
      }
      const block = entity.node.value;
      const categories =
        block.kind === 'Block'
          ? extractSlots(block).slots.flatMap((slot) => slot.allowedCategories)
          : [];
      return [
        { categories, domain: entity.classification.domain },
      ] satisfies ArchetypeDomainSlots[];
    }),
  );
}

describe('vanilla module domain derivation (ADR 017 over ADR 018)', () => {
  it('stamps the air archetype domain onto every category its engine slot allows', () => {
    const index = moduleDomainIndexFor(AIR_ARCHETYPE);

    expect(index.get('plane_engine_type')).toBe('air');
    expect(index.get('twin_plane_engine_type')).toBe('air');
  });

  it('classifies a plane_engine_type module as air through the derived index', () => {
    const index = moduleDomainIndexFor(AIR_ARCHETYPE);

    const [engine] = extractModules(
      parse(ENGINE_MODULE, { dialects: [] }),
      index,
    );

    expect(engine).toMatchObject({
      category: 'plane_engine_type',
      domain: 'air',
      name: 'plane_engine_1',
    });
  });
});
