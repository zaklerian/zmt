import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  IdentifierNode,
  NumberValueNode,
  OperatorNode,
  ParadoxValue,
  Script,
  ScriptChild,
  StringValueNode,
} from '@paradox-parser';

import { describe, expect, it } from 'vitest';

import { extractModules } from './extract-modules.util';

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

function id(name: string): IdentifierNode {
  return { ...base(), kind: 'Identifier', name };
}

// Wrap one `<name> = { ... }` module in the `equipment_modules = { ... }` envelope.
function modules(...entries: AssignmentNode[]): Script {
  return script([assign('equipment_modules', block(entries))]);
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

describe('extractModules', () => {
  it('surfaces the module category and retains the node', () => {
    const entry = assign(
      'engine_small_1',
      block([assign('category', id('engine'))]),
    );

    const [entity, ...rest] = extractModules(modules(entry));

    expect(rest).toEqual([]);
    expect(entity).toMatchObject({
      category: 'engine',
      name: 'engine_small_1',
    });
    expect(entity?.node).toBe(entry);
  });

  it('surfaces an empty category when the source omits it', () => {
    const entry = assign('modder_widget', block([assign('foo', id('bar'))]));

    const [entity] = extractModules(modules(entry));

    expect(entity).toMatchObject({
      category: '',
      name: 'modder_widget',
    });
  });

  it('projects top-level scalars, excluding the name and the category key', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign('engine_small_1', num('99')),
        assign('build_cost_ic', num('5')),
        assign('reliability', str('high')),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.scalars).toEqual([
      { key: 'build_cost_ic', value: '5' },
      { key: 'reliability', value: 'high' },
    ]);
  });

  it('projects a custom modder key inside a stat block', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign(
          'add_stats',
          block([
            assign('air_range', num('100')),
            assign('my_custom_stat', num('7')),
          ]),
        ),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.statBlocks.add_stats).toEqual([
      { key: 'air_range', value: '100' },
      { key: 'my_custom_stat', value: '7' },
    ]);
  });

  it('yields an empty list for an absent stat block', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign('add_stats', block([assign('air_range', num('100'))])),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.statBlocks.add_stats).toEqual([
      { key: 'air_range', value: '100' },
    ]);
    expect(entity?.statBlocks.multiply_stats).toEqual([]);
    expect(entity?.statBlocks.add_average_stats).toEqual([]);
  });

  it('projects the cost maps as flat resource → number fields', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign(
          'build_cost_resources',
          block([assign('steel', num('2')), assign('chromium', num('1'))]),
        ),
        assign('dismantle_cost_resources', block([assign('steel', num('1'))])),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.costMaps.build_cost_resources).toEqual([
      { key: 'steel', value: '2' },
      { key: 'chromium', value: '1' },
    ]);
    expect(entity?.costMaps.dismantle_cost_resources).toEqual([
      { key: 'steel', value: '1' },
    ]);
  });

  it('yields an empty list for an absent cost map', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign('build_cost_resources', block([assign('steel', num('2'))])),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.costMaps.build_cost_resources).toEqual([
      { key: 'steel', value: '2' },
    ]);
    expect(entity?.costMaps.dismantle_cost_resources).toEqual([]);
  });

  it('excludes a non-stat nested block from every projection', () => {
    const entry = assign(
      'engine_small_1',
      block([
        assign('category', id('engine')),
        assign('gui', block([assign('x', num('1'))])),
        assign('add_stats', block([assign('air_range', num('100'))])),
      ]),
    );

    const [entity] = extractModules(modules(entry));

    expect(entity?.scalars.map((field) => field.key)).not.toContain('gui');
    expect(entity?.statBlocks.add_stats).toEqual([
      { key: 'air_range', value: '100' },
    ]);
    expect(entity?.statBlocks.multiply_stats).toEqual([]);
    expect(entity?.statBlocks.add_average_stats).toEqual([]);
  });

  it('ignores top-level blocks that are not `equipment_modules`', () => {
    const target = script([
      assign('something_else', block([assign('foo', block([]))])),
      assign(
        'equipment_modules',
        block([
          assign('engine_small_1', block([assign('category', id('engine'))])),
        ]),
      ),
    ]);

    const entities = extractModules(target);

    expect(entities).toHaveLength(1);
    expect(entities[0]?.name).toBe('engine_small_1');
  });

  it('preserves module order and is deterministic for a given input', () => {
    const target = modules(
      assign('engine_small_1', block([assign('category', id('engine'))])),
      assign(
        'ship_gun_1',
        block([assign('category', id('ship_light_battery'))]),
      ),
      assign('turret_a', block([assign('category', id('turret_type'))])),
    );

    const first = extractModules(target);
    const second = extractModules(target);

    expect(first.map((entity) => entity.name)).toEqual([
      'engine_small_1',
      'ship_gun_1',
      'turret_a',
    ]);
    expect(first).toEqual(second);
  });
});
