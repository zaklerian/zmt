import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  BooleanValueNode,
  IdentifierNode,
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
  it('classifies an archetype with an air type and retains its node', () => {
    const entry = assign(
      'fighter_equipment',
      block([
        assign('is_archetype', bool(true)),
        assign('type', id('fighter')),
      ]),
    );

    const [entity, ...rest] = extractEquipment(equipments(entry), new Map());

    expect(rest).toEqual([]);
    expect(entity).toMatchObject({
      classification: {
        domain: 'air',
        status: 'classified',
        type: ['fighter'],
      },
      kind: 'archetype',
      name: 'fighter_equipment',
    });
    expect(entity?.node).toBe(entry);
  });

  it('classifies a regular by resolving its archetype ref through the index', () => {
    const entry = assign(
      'fighter_equipment_1',
      block([assign('archetype', id('fighter_equipment'))]),
    );
    const index = new Map<string, readonly string[]>([
      ['fighter_equipment', ['fighter']],
    ]);

    const [entity] = extractEquipment(equipments(entry), index);

    expect(entity).toMatchObject({
      classification: {
        domain: 'air',
        status: 'classified',
        type: ['fighter'],
      },
      kind: 'regular',
      name: 'fighter_equipment_1',
    });
  });

  it('classifies a multi-token type sharing one domain, keeping both tokens', () => {
    const entry = assign(
      'multi_role',
      block([
        assign('is_archetype', bool(true)),
        assign('type', block([id('fighter'), id('cas')])),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      domain: 'air',
      status: 'classified',
      type: ['fighter', 'cas'],
    });
  });

  it('marks a type token absent from the table as unknown-type', () => {
    const entry = assign(
      'mystery',
      block([
        assign('is_archetype', bool(true)),
        assign('type', id('frigate')),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'unknown-type',
      status: 'invalid',
    });
  });

  it('marks a type spanning two domains as cross-domain-type', () => {
    const entry = assign(
      'cross_domain',
      block([
        assign('is_archetype', bool(true)),
        assign('type', block([id('fighter'), id('infantry')])),
      ]),
    );

    const [entity] = extractEquipment(equipments(entry), new Map());

    expect(entity?.classification).toEqual({
      reason: 'cross-domain-type',
      status: 'invalid',
    });
  });

  it('marks an archetype with empty or absent type as archetype-missing-type', () => {
    const absent = assign(
      'no_type',
      block([assign('is_archetype', bool(true))]),
    );
    const empty = assign(
      'empty_type',
      block([assign('is_archetype', bool(true)), assign('type', block([]))]),
    );

    const [absentEntity, emptyEntity] = extractEquipment(
      equipments(absent, empty),
      new Map(),
    );

    expect(absentEntity?.classification).toEqual({
      reason: 'archetype-missing-type',
      status: 'invalid',
    });
    expect(emptyEntity?.classification).toEqual({
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

  it('ignores top-level blocks that are not `equipments`', () => {
    const target = script([
      assign('countries', block([assign('SOV', block([]))])),
      assign(
        'equipments',
        block([
          assign(
            'fighter_equipment',
            block([
              assign('is_archetype', bool(true)),
              assign('type', str('fighter')),
            ]),
          ),
        ]),
      ),
    ]);

    const entities = extractEquipment(target, new Map());

    expect(entities).toHaveLength(1);
    expect(entities[0]?.name).toBe('fighter_equipment');
  });

  it('preserves entity order and is deterministic for a given input', () => {
    const target = equipments(
      assign(
        'fighter_equipment',
        block([
          assign('is_archetype', bool(true)),
          assign('type', id('fighter')),
        ]),
      ),
      assign(
        'infantry_equipment',
        block([assign('archetype', id('infantry_base'))]),
      ),
      assign(
        'sub_equipment',
        block([
          assign('is_archetype', bool(true)),
          assign('type', id('submarine')),
        ]),
      ),
    );
    const index = new Map<string, readonly string[]>([
      ['infantry_base', ['infantry']],
    ]);

    const first = extractEquipment(target, index);
    const second = extractEquipment(target, index);

    expect(first.map((entity) => entity.name)).toEqual([
      'fighter_equipment',
      'infantry_equipment',
      'sub_equipment',
    ]);
    expect(first).toEqual(second);
  });
});
