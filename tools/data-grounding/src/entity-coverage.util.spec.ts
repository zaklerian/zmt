import { describe, expect, it } from 'vitest';

import type { EntityType } from './entity-type.const';

import {
  buildArchetypeIndexFor,
  computeFileCoverage,
} from './entity-coverage.util';
import { parseSource } from './parse-file.util';

function unmodeled(type: EntityType, source: string): string[] {
  const script = parseSource(source);
  const archetypeIndex =
    type === 'equipment'
      ? buildArchetypeIndexFor([script])
      : new Map<string, readonly string[]>();
  return computeFileCoverage(type, script, source, archetypeIndex)
    .keys.map((key) => key.keyPath)
    .sort();
}

describe('computeFileCoverage', () => {
  describe('module', () => {
    const source = `equipment_modules = {
\tmy_module = {
\t\t@local = 5
\t\tcategory = special_type
\t\tgfx = my_gfx
\t\tadd_stats = { reliability = 0.1 }
\t\tbuild_cost_resources = { steel = @local }
\t\tgui = { some_gui_key = 1 }
\t\tcan_convert_from = { other_module }
\t}
}
`;

    it('reports only the unmodeled blocks at the frontier', () => {
      expect(unmodeled('module', source)).toEqual(['can_convert_from', 'gui']);
    });

    it('never reports a symbol definition as an unmodeled key (ADR 022 D7)', () => {
      expect(unmodeled('module', source)).not.toContain('@local');
    });

    it('does not report modeled leaves inside modeled nested blocks', () => {
      const keys = unmodeled('module', source);
      expect(keys).not.toContain('build_cost_resources.steel');
      expect(keys).not.toContain('add_stats.reliability');
      expect(keys).not.toContain('category');
      expect(keys).not.toContain('gfx');
    });
  });

  describe('technology — ZMT-E28 modeled edge kinds, sub-techs, XOR', () => {
    // The four ADR 023 drop classes are now modeled (ZMT-E28): the block-form
    // `dependencies` edge, `sub_technologies`, uppercase `XOR`, and
    // `path.ignore_for_layout`. The instrument still surfaces a genuine drop
    // (`ai_will_do`) so the frontier report is not vacuously empty.
    const source = `technologies = {
\tinfantry_weapons = {
\t\tresearch_cost = 2.0
\t\tfolder = { name = f position = { x = 0 y = 0 } }
\t\tpath = { leads_to_tech = t research_cost_coeff = 1 ignore_for_layout = yes }
\t\tcategories = { infantry_tech }
\t\txor = { shotgun_branch }
\t\tXOR = { smg_branch }
\t\tsub_technologies = { infantry_at }
\t\tdependencies = { artillery = 1 }
\t\tai_will_do = { factor = 0 }
\t}
}
`;

    it('models the block-form dependencies edge target (no longer a drop)', () => {
      // The `{ tech = n }` form's key is the edge target; it is read, not dropped.
      expect(unmodeled('technology', source)).not.toContain(
        'dependencies.artillery',
      );
    });

    it('models sub_technologies as the attached-node list', () => {
      expect(unmodeled('technology', source)).not.toContain('sub_technologies');
    });

    it('models XOR case-insensitively (both xor and XOR)', () => {
      const keys = unmodeled('technology', source);
      expect(keys).not.toContain('XOR');
      expect(keys).not.toContain('xor');
    });

    it('models path.ignore_for_layout', () => {
      expect(unmodeled('technology', source)).not.toContain(
        'path.ignore_for_layout',
      );
    });

    it('does not report modeled folder/position leaves', () => {
      const keys = unmodeled('technology', source);
      expect(keys).not.toContain('folder.name');
      expect(keys).not.toContain('folder.position.x');
    });

    it('still surfaces a genuinely unmodeled ecosystem block', () => {
      expect(unmodeled('technology', source)).toContain('ai_will_do');
    });
  });

  describe('character — modeled role descends, ecosystem block reported', () => {
    const source = `characters = {
\tc = {
\t\tname = "N"
\t\tportraits = { army = { large = g } }
\t\tadvisor = {
\t\t\tslot = political_advisor
\t\t\ttraits = { t }
\t\t\ton_add = { log = "x" }
\t\t}
\t\tallowed_civil_war = { always = yes }
\t}
}
`;

    it('reports the ecosystem sub-block and the unmodeled root block only', () => {
      expect(unmodeled('character', source)).toEqual([
        'advisor.on_add',
        'allowed_civil_war',
      ]);
    });
  });

  describe('state — thin history reports the unmodeled keys', () => {
    const source = `state = {
\tid = 1
\tname = "S"
\tbuildings = { infrastructure = 3 100 = { naval_base = 2 } }
\thistory = { owner = GER add_core_of = GER }
\tprovinces = { 100 }
}
`;

    it('reports history keys outside owner/controller, keeps province buildings modeled', () => {
      const keys = unmodeled('state', source);
      expect(keys).toContain('history.add_core_of');
      expect(keys).not.toContain('history.owner');
      expect(keys).not.toContain('buildings.100.naval_base');
      expect(keys).not.toContain('buildings.infrastructure');
    });
  });

  describe('equipment', () => {
    const source = `equipments = {
\tinfantry_equipment_0 = {
\t\tis_archetype = yes
\t\tinterface_category = interface_category_land
\t\ttype = { infantry }
\t\tmax_organisation = 60
\t\tresources = { steel = 1 }
\t}
}
`;

    it('reports the unmodeled block, keeps classification keys modeled', () => {
      const keys = unmodeled('equipment', source);
      expect(keys).toEqual(['resources']);
      expect(keys).not.toContain('type');
      expect(keys).not.toContain('interface_category');
    });
  });

  describe('ideology', () => {
    const source = `ideologies = {
\ti = {
\t\twar_impact_on_world_tension = 0.5
\t\ttypes = { sub = { m = 1 } }
\t\tcolor = { 1 2 3 }
\t}
}
`;

    it('reports the unmodeled color block, keeps types map modeled', () => {
      const keys = unmodeled('ideology', source);
      expect(keys).toEqual(['color']);
      expect(keys).not.toContain('types.sub.m');
    });
  });

  describe('technologyCategory — ZMT-35 declared vocabulary', () => {
    const source = `technology_categories = {
\tarmor
\tartillery
}
technology_folders = {
\tinfantry_folder = { ledger = army }
}
`;

    it('models the category vocabulary and reports technology_folders as the one unmodeled key (Q61)', () => {
      // The bare tokens under technology_categories carry no key, so they never
      // surface; technology_folders is the intentional known-unmodeled frontier.
      expect(unmodeled('technologyCategory', source)).toEqual([
        'technology_folders',
      ]);
    });
  });
});
