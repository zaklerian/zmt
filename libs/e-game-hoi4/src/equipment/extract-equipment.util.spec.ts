import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  BooleanValueNode,
  IdentifierNode,
  NumberValueNode,
  OperatorNode,
  ParadoxValue,
  Script,
  ScriptChild,
  StringValueNode,
} from '@paradox-parser';

import { describe, expect, it } from 'vitest';

import { extractEquipment } from './extract-equipment.util';

function assign(key: string, value: ParadoxValue): AssignmentNode {
  return { ...base(), key: id(key), kind: 'Assignment', operator: op(), value };
}

function base(): {
  dirty: boolean;
  from: number;
  leadingTrivia: [];
  to: number;
  trailingTrivia: [];
} {
  return {
    dirty: false,
    from: 0,
    leadingTrivia: [],
    to: 0,
    trailingTrivia: [],
  };
}

function block(children: BlockChild[]): BlockNode {
  return {
    ...base(),
    children,
    innerLeadingTrivia: [],
    innerTrailingTrivia: [],
    kind: 'Block',
  };
}

function bool(value: boolean): BooleanValueNode {
  return { ...base(), kind: 'BooleanValue', value };
}

// Wrap one `<name> = { ... }` entity in the `equipments = { ... }` envelope.
function equipments(...entries: AssignmentNode[]): Script {
  return script([assign('equipments', block(entries))]);
}

function id(name: string): IdentifierNode {
  return { ...base(), kind: 'Identifier', name };
}

function num(raw: string): NumberValueNode {
  return { ...base(), kind: 'NumberValue', raw, value: Number(raw) };
}

function op(): OperatorNode {
  return { ...base(), kind: 'Operator', opKind: 'eq' };
}

function script(children: ScriptChild[]): Script {
  return { ...base(), children, errors: [], kind: 'Script' };
}

function str(value: string): StringValueNode {
  return { ...base(), kind: 'StringValue', raw: `"${value}"`, value };
}

describe('extractEquipment', () => {
  it('classifies an air archetype from its interface_category and retains its node', () => {
    const entry = assign(
      'small_plane_airframe',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_air')),
        assign('type', id('small_plane')),
      ]),
    );

    const [entity, ...rest] = extractEquipment(equipments(entry), new Map());

    expect(rest).toEqual([]);
    expect(entity).toMatchObject({
      classification: {
        domain: 'air',
        status: 'classified',
        type: ['small_plane'],
      },
      kind: 'archetype',
      name: 'small_plane_airframe',
    });
    expect(entity?.node).toBe(entry);
  });

  it('maps interface_category_armor to the land domain', () => {
    const entry = assign(
      'light_tank_chassis',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_armor')),
        assign('type', id('light_tank')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      domain: 'land',
      status: 'classified',
      type: ['light_tank'],
    });
  });

  it('maps interface_category_capital_ships to the naval domain', () => {
    const entry = assign(
      'ship_hull_heavy',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_capital_ships')),
        assign('type', id('heavy_ship')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      domain: 'naval',
      status: 'classified',
      type: ['heavy_ship'],
    });
  });

  it('marks an archetype whose interface_category is absent as invalid', () => {
    const entry = assign(
      'no_category',
      block([
        assign('is_archetype', bool(true)),
        assign('type', id('fighter')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'archetype-missing-type',
      status: 'invalid',
    });
  });

  it('marks an archetype whose interface_category is not in the map as invalid', () => {
    const entry = assign(
      'space_frame',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_space')),
        assign('type', id('orbital')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'archetype-missing-type',
      status: 'invalid',
    });
  });

  it('marks an archetype with no type token as invalid even when it has a domain', () => {
    const entry = assign(
      'typeless',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_air')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'archetype-missing-type',
      status: 'invalid',
    });
  });

  it('marks a regular whose archetype ref is absent from the index as unresolved', () => {
    const entry = assign(
      'orphan_equipment',
      block([assign('archetype', id('missing_archetype'))]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      archetypeRef: 'missing_archetype',
      status: 'unresolved',
    });
  });

  it('marks a regular that carries no archetype ref as invalid', () => {
    const entry = assign(
      'loose_equipment',
      block([assign('reliability', num('0.8'))]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'regular-ref-not-typed',
      status: 'invalid',
    });
  });

  it('does not classify a variant that carries no interface_category of its own (archetype-domain inheritance is deferred)', () => {
    const entry = assign(
      'small_plane_airframe_0',
      block([assign('archetype', id('small_plane_airframe'))]),
    );
    const index = new Map<string, readonly string[]>([
      ['small_plane_airframe', ['small_plane']],
    ]);

    const [entity] = extractEquipment(equipments(entry), index);

    expect(entity?.classification).toEqual({
      reason: 'regular-ref-not-typed',
      status: 'invalid',
    });
  });

  it('ignores top-level blocks that are not `equipments`', () => {
    const target = script([
      assign('countries', block([assign('SOV', block([]))])),
      assign(
        'equipments',
        block([
          assign(
            'small_plane_airframe',
            block([
              assign('is_archetype', bool(true)),
              assign('interface_category', id('interface_category_air')),
              assign('type', str('small_plane')),
            ]),
          ),
        ]),
      ),
    ]);

    const entities = extractEquipment(target, new Map());

    expect(entities).toHaveLength(1);
    expect(entities[0]?.name).toBe('small_plane_airframe');
  });

  it('projects scalar leaf fields, keeping custom keys and excluding identity and classifier keys', () => {
    const entry = assign(
      'small_plane_airframe',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_air')),
        assign('type', id('small_plane')),
        assign('archetype', id('plane_base')),
        assign('small_plane_airframe', num('99')),
        assign('reliability', num('0.8')),
        assign('build_cost_ic', num('20')),
        assign('my_custom_stat', str('experimental')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.scalars).toEqual([
      { key: 'interface_category', value: 'interface_category_air' },
      { key: 'reliability', value: '0.8' },
      { key: 'build_cost_ic', value: '20' },
      { key: 'my_custom_stat', value: 'experimental' },
    ]);
  });

  it('omits nested blocks from the scalar projection', () => {
    const entry = assign(
      'small_plane_airframe',
      block([
        assign('is_archetype', bool(true)),
        assign('interface_category', id('interface_category_air')),
        assign('type', id('small_plane')),
        assign('reliability', num('0.8')),
        assign('modules', block([assign('fixed_slot', id('engine'))])),
        assign('upgrades', block([assign('armor_value', num('1'))])),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.scalars.map((scalar) => scalar.key)).not.toContain(
      'modules',
    );
    expect(entity?.scalars.map((scalar) => scalar.key)).not.toContain(
      'upgrades',
    );
  });

  it('preserves entity order and is deterministic for a given input', () => {
    const target = equipments(
      assign(
        'small_plane_airframe',
        block([
          assign('is_archetype', bool(true)),
          assign('interface_category', id('interface_category_air')),
          assign('type', id('small_plane')),
        ]),
      ),
      assign(
        'infantry_equipment_0',
        block([assign('archetype', id('infantry_equipment'))]),
      ),
      assign(
        'submarine_hull',
        block([
          assign('is_archetype', bool(true)),
          assign('interface_category', id('interface_category_screen_ships')),
          assign('type', id('submarine')),
        ]),
      ),
    );
    const index = new Map<string, readonly string[]>([
      ['infantry_equipment', ['infantry']],
    ]);

    const first = extractEquipment(target, index);
    const second = extractEquipment(target, index);

    expect(first.map((entity) => entity.name)).toEqual([
      'small_plane_airframe',
      'infantry_equipment_0',
      'submarine_hull',
    ]);
    expect(first).toEqual(second);
  });
});
