import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { MODULE_DIR } from '../module/module-location.const';
import { TECHNOLOGY_DIR } from '../technology/technology-location.const';
import { ENTITY_REGISTRY } from './entity-registry.const';

// Guards the registry wiring: each entry points at the right folder and its
// `identify` accessor names the entity by the field the extractor produces
// (module → `name`, technology → `token`) — the failure a copy-paste swap would
// introduce (e.g. module identifying by `token`, which modules do not have).
describe('ENTITY_REGISTRY', () => {
  it('wires the module entry to MODULE_DIR and identifies by name', () => {
    const { extract, folder, identify } = ENTITY_REGISTRY.module;
    expect(folder).toBe(MODULE_DIR);

    const script = parse('equipment_modules = { foo = { category = engine } }');
    const [entity] = extract(script);
    expect(identify(entity)).toBe('foo');
  });

  it('wires the technology entry to TECHNOLOGY_DIR and identifies by token', () => {
    const { extract, folder, identify } = ENTITY_REGISTRY.technology;
    expect(folder).toBe(TECHNOLOGY_DIR);

    const script = parse('technologies = { my_tech = { } }');
    const [entity] = extract(script);
    expect(identify(entity)).toBe('my_tech');
  });

  it('wires each entry to its own slimProjector shape (module → category, technology → nodeKind)', () => {
    const [module] = ENTITY_REGISTRY.module.extract(
      parse('equipment_modules = { foo = { category = engine } }'),
    );
    expect(ENTITY_REGISTRY.module.slimProjector(module)).toEqual({
      category: 'engine',
      id: 'foo',
      name: 'foo',
    });

    const [technology] = ENTITY_REGISTRY.technology.extract(
      parse('technologies = { my_tech = { } }'),
    );
    expect(ENTITY_REGISTRY.technology.slimProjector(technology)).toMatchObject({
      id: 'my_tech',
      nodeKind: 'sub',
      position: null,
    });
  });
});
