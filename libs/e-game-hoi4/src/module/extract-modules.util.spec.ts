import type { EquipmentDomain } from '@contracts';
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

// Domain index supplied by the caller (ADR 017); replaces the removed static
// category→domain table. Categories absent here classify as 'unclassified'.
const DOMAIN_INDEX = new Map<string, EquipmentDomain>([
  ['engine', 'air'],
  ['ship_light_battery', 'naval'],
  ['turret_type', 'land'],
]);

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
  it('classifies a known category to its domain and retains the node', () => {
    const entry = assign(
      'engine_small_1',
      block([assign('category', id('engine'))]),
    );

    const [entity, ...rest] = extractModules(modules(entry), DOMAIN_INDEX);

    expect(rest).toEqual([]);
    expect(entity).toMatchObject({
      category: 'engine',
      domain: 'air',
      name: 'engine_small_1',
    });
    expect(entity?.node).toBe(entry);
  });

  it('classifies a naval category to its domain', () => {
    const entry = assign(
      'ship_light_battery_1',
      block([assign('category', id('ship_light_battery'))]),
    );

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

    expect(entity?.domain).toBe('naval');
  });

  it('classifies a category absent from the index as unclassified', () => {
    const entry = assign(
      'modder_widget',
      block([assign('category', id('totally_made_up'))]),
    );

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

    expect(entity).toMatchObject({
      category: 'totally_made_up',
      domain: 'unclassified',
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

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

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

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

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

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

    expect(entity?.statBlocks.add_stats).toEqual([
      { key: 'air_range', value: '100' },
    ]);
    expect(entity?.statBlocks.multiply_stats).toEqual([]);
    expect(entity?.statBlocks.add_average_stats).toEqual([]);
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

    const [entity] = extractModules(modules(entry), DOMAIN_INDEX);

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

    const entities = extractModules(target, DOMAIN_INDEX);

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

    const first = extractModules(target, DOMAIN_INDEX);
    const second = extractModules(target, DOMAIN_INDEX);

    expect(first.map((entity) => entity.name)).toEqual([
      'engine_small_1',
      'ship_gun_1',
      'turret_a',
    ]);
    expect(first).toEqual(second);
  });
});
