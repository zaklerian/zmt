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

import { extractIdeologies } from './extract-ideologies.util';

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

// Wrap one or more ideology bodies in the top-level `ideologies = { … }` wrapper.
function ideologiesScript(...entries: AssignmentNode[]): Script {
  return script([assign('ideologies', block(entries))]);
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

describe('extractIdeologies', () => {
  it('descends the ideologies wrapper and yields each ideology as an entity', () => {
    const entities = extractIdeologies(
      ideologiesScript(
        assign('democratic', block([assign('id', num('0'))])),
        assign('fascism', block([assign('id', num('1'))])),
      ),
    );

    expect(entities.map((entity) => entity.token)).toEqual([
      'democratic',
      'fascism',
    ]);
  });

  it('surfaces the modeled root tension scalars in order (raw values)', () => {
    const [entity] = extractIdeologies(
      ideologiesScript(
        assign(
          'democratic',
          block([
            assign('war_impact_on_world_tension', num('0.5')),
            assign('faction_impact_on_world_tension', num('0.75')),
            assign('can_be_boosted', id('yes')),
          ]),
        ),
      ),
    );

    // can_be_boosted is unmodeled: it is not projected, it stays lossless.
    expect(entity?.rootScalars).toEqual([
      { key: 'war_impact_on_world_tension', value: '0.5' },
      { key: 'faction_impact_on_world_tension', value: '0.75' },
    ]);
  });

  it('projects the types map, modeling only can_be_randomly_selected per entry', () => {
    const [entity] = extractIdeologies(
      ideologiesScript(
        assign(
          'democratic',
          block([
            assign(
              'types',
              block([
                assign(
                  'liberalism',
                  block([assign('can_be_randomly_selected', id('yes'))]),
                ),
                assign('conservatism', block([])),
              ]),
            ),
          ]),
        ),
      ),
    );

    expect(entity?.types).toEqual([
      {
        key: 'liberalism',
        scalars: [{ key: 'can_be_randomly_selected', value: 'yes' }],
      },
      { key: 'conservatism', scalars: [] },
    ]);
  });

  it('lowers dynamic_faction_names to bare tokens', () => {
    const [entity] = extractIdeologies(
      ideologiesScript(
        assign(
          'democratic',
          block([
            assign(
              'dynamic_faction_names',
              block([str('FACTION_ONE'), str('FACTION_TWO')]),
            ),
          ]),
        ),
      ),
    );

    expect(entity?.dynamicFactionNames).toEqual(['FACTION_ONE', 'FACTION_TWO']);
  });

  it('yields empty surfaces when the ideology omits every modeled block', () => {
    const [entity] = extractIdeologies(
      ideologiesScript(assign('neutrality', block([]))),
    );

    expect(entity).toEqual({
      dynamicFactionNames: [],
      rootScalars: [],
      token: 'neutrality',
      types: [],
    });
  });

  it('ignores non-`ideologies` top-level blocks', () => {
    const target = script([
      assign('something_else', block([assign('democratic', block([]))])),
      assign('ideologies', block([assign('fascism', block([]))])),
    ]);

    const entities = extractIdeologies(target);

    expect(entities).toHaveLength(1);
    expect(entities[0]?.token).toBe('fascism');
  });
});
