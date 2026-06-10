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

import { buildArchetypeIndex } from './build-archetype-index.util';

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

describe('buildArchetypeIndex', () => {
  it('maps a directly-typed entry to its scalar type token', () => {
    const file = equipments(
      assign(
        'infantry_equipment',
        block([
          assign('is_archetype', bool(true)),
          assign('type', id('infantry')),
        ]),
      ),
    );

    const index = buildArchetypeIndex([file]);

    expect([...index]).toEqual([['infantry_equipment', ['infantry']]]);
  });

  it('collects every token of a block-valued type', () => {
    const file = equipments(
      assign(
        'multi_role',
        block([assign('type', block([id('fighter'), id('cas')]))]),
      ),
    );

    const index = buildArchetypeIndex([file]);

    expect(index.get('multi_role')).toEqual(['fighter', 'cas']);
  });

  it('excludes regulars that carry no direct type', () => {
    const file = equipments(
      assign(
        'infantry_0',
        block([assign('archetype', id('infantry_equipment'))]),
      ),
    );

    const index = buildArchetypeIndex([file]);

    expect(index.size).toBe(0);
  });

  it('spans archetypes across multiple parsed files', () => {
    const vanilla = equipments(
      assign('infantry_equipment', block([assign('type', id('infantry'))])),
    );
    const mod = equipments(
      assign('mod_fighter', block([assign('type', str('fighter'))])),
    );

    const index = buildArchetypeIndex([vanilla, mod]);

    expect(index.get('infantry_equipment')).toEqual(['infantry']);
    expect(index.get('mod_fighter')).toEqual(['fighter']);
  });
});
