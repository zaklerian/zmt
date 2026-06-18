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

import { extractStates } from './extract-states.util';

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

function num(raw: string): NumberValueNode {
  return { ...base(), kind: 'NumberValue', raw, value: Number(raw) };
}

function op(): OperatorNode {
  return { ...base(), kind: 'Operator', opKind: 'eq' };
}

function script(children: ScriptChild[]): Script {
  return { ...base(), children, errors: [], kind: 'Script' };
}

// Wrap the state body in the file-root `state = { … }` block.
function stateScript(...body: BlockChild[]): Script {
  return script([assign('state', block(body))]);
}

function str(value: string): StringValueNode {
  return { ...base(), kind: 'StringValue', raw: `"${value}"`, value };
}

describe('extractStates', () => {
  it('surfaces id, name, and the modeled root scalars in order (raw values)', () => {
    const [entity, ...rest] = extractStates(
      stateScript(
        assign('id', num('12')),
        assign('name', str('STATE_12')),
        assign('manpower', num('1000')),
        assign('state_category', id('rural')),
        assign('impassable', id('yes')),
      ),
    );

    expect(rest).toEqual([]);
    expect(entity?.id).toBe('12');
    expect(entity?.name).toBe('"STATE_12"');
    expect(entity?.rootScalars).toEqual([
      { key: 'id', value: '12' },
      { key: 'name', value: '"STATE_12"' },
      { key: 'manpower', value: '1000' },
      { key: 'state_category', value: 'rural' },
      { key: 'impassable', value: 'yes' },
    ]);
  });

  it('yields empty maps and lists when the source omits every sub-block', () => {
    const [entity] = extractStates(stateScript(assign('id', num('1'))));

    expect(entity).toEqual({
      buildings: [],
      history: [],
      id: '1',
      name: '',
      navalBase: [],
      provinces: [],
      resources: [],
      rootScalars: [{ key: 'id', value: '1' }],
    });
  });

  it('projects the resources map as every scalar leaf (variable keys)', () => {
    const [entity] = extractStates(
      stateScript(
        assign(
          'resources',
          block([assign('oil', num('5')), assign('steel', num('10'))]),
        ),
      ),
    );

    expect(entity?.resources).toEqual([
      { key: 'oil', value: '5' },
      { key: 'steel', value: '10' },
    ]);
  });

  it('separates buildings rows from the naval_base sub-block', () => {
    const [entity] = extractStates(
      stateScript(
        assign(
          'buildings',
          block([
            assign('infrastructure', num('3')),
            assign('arms_factory', num('2')),
            assign('naval_base', block([assign('1234', num('1'))])),
          ]),
        ),
      ),
    );

    // The naval_base block does not leak into buildings rows.
    expect(entity?.buildings).toEqual([
      { key: 'infrastructure', value: '3' },
      { key: 'arms_factory', value: '2' },
    ]);
    expect(entity?.navalBase).toEqual([{ key: '1234', value: '1' }]);
  });

  it('models history thin (owner / controller), ignoring dated blocks and overrides', () => {
    const [entity] = extractStates(
      stateScript(
        assign(
          'history',
          block([
            assign('owner', id('GER')),
            assign('controller', id('GER')),
            assign('1939.1.1', block([assign('owner', id('SOV'))])),
            assign('buildings', block([assign('infrastructure', num('5'))])),
          ]),
        ),
      ),
    );

    expect(entity?.history).toEqual([
      { key: 'owner', value: 'GER' },
      { key: 'controller', value: 'GER' },
    ]);
  });

  it('lowers the provinces block to bare id tokens', () => {
    const [entity] = extractStates(
      stateScript(assign('provinces', block([num('1'), num('2'), num('3')]))),
    );

    expect(entity?.provinces).toEqual(['1', '2', '3']);
  });

  it('ignores non-`state` top-level blocks', () => {
    const target = script([
      assign('something_else', block([assign('id', num('9'))])),
      assign('state', block([assign('id', num('1'))])),
    ]);

    const entities = extractStates(target);

    expect(entities).toHaveLength(1);
    expect(entities[0]?.id).toBe('1');
  });
});
