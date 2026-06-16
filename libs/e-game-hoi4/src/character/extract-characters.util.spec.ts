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

import { extractCharacters } from './extract-characters.util';

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

// Wrap one or more `<token> = { ... }` characters in the `characters = { ... }`
// container.
function characters(...entries: AssignmentNode[]): Script {
  return script([assign('characters', block(entries))]);
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

describe('extractCharacters', () => {
  it('surfaces the token and the raw root scalars (quotes preserved)', () => {
    const entry = assign(
      'Some_Leader',
      block([assign('name', str('NAME_KEY')), assign('gender', id('male'))]),
    );

    const [entity, ...rest] = extractCharacters(characters(entry));

    expect(rest).toEqual([]);
    // String scalars keep their raw token so a save round-trips them verbatim.
    expect(entity).toMatchObject({
      gender: 'male',
      name: '"NAME_KEY"',
      token: 'Some_Leader',
    });
  });

  it('yields empty root scalars and no blocks when the source omits them', () => {
    const [entity] = extractCharacters(
      characters(assign('Nameless', block([]))),
    );

    expect(entity).toEqual({
      gender: '',
      name: '',
      portraits: [],
      roles: [],
      token: 'Nameless',
    });
  });

  it('projects present portrait groups with their raw gfx-path rows', () => {
    const entry = assign(
      'L',
      block([
        assign(
          'portraits',
          block([
            assign(
              'army',
              block([
                assign('large', str('gfx/large.dds')),
                assign('small', str('gfx/small.dds')),
              ]),
            ),
          ]),
        ),
      ]),
    );

    const [entity] = extractCharacters(characters(entry));

    expect(entity?.portraits).toEqual([
      {
        group: 'army',
        rows: [
          { key: 'large', value: '"gfx/large.dds"' },
          { key: 'small', value: '"gfx/small.dds"' },
        ],
      },
    ]);
  });

  it('projects role scalars and lowers the traits block to bare tokens', () => {
    const entry = assign(
      'L',
      block([
        assign(
          'corps_commander',
          block([
            assign('skill', num('4')),
            assign('traits', block([id('trait_one'), id('trait_two')])),
          ]),
        ),
      ]),
    );

    const [entity] = extractCharacters(characters(entry));

    expect(entity?.roles).toEqual([
      {
        id: 'corps_commander',
        scalars: [{ key: 'skill', value: '4' }],
        traits: ['trait_one', 'trait_two'],
      },
    ]);
  });

  it('excludes a role ecosystem sub-block from the projected scalars', () => {
    const entry = assign(
      'L',
      block([
        assign(
          'advisor',
          block([
            assign('slot', id('political_advisor')),
            assign('on_add', block([assign('x', num('1'))])),
          ]),
        ),
      ]),
    );

    const [entity] = extractCharacters(characters(entry));

    expect(entity?.roles).toEqual([
      {
        id: 'advisor',
        scalars: [{ key: 'slot', value: 'political_advisor' }],
        traits: [],
      },
    ]);
  });

  it('ignores unrecognized sub-blocks and non-`characters` top-level blocks', () => {
    const target = script([
      assign('something_else', block([assign('foo', block([]))])),
      assign(
        'characters',
        block([
          assign(
            'L',
            block([
              assign('name', str('X')),
              assign('not_a_role', block([assign('y', num('1'))])),
            ]),
          ),
        ]),
      ),
    ]);

    const entities = extractCharacters(target);

    expect(entities).toHaveLength(1);
    expect(entities[0]?.token).toBe('L');
    expect(entities[0]?.roles).toEqual([]);
    expect(entities[0]?.portraits).toEqual([]);
  });

  it('preserves character order and is deterministic for a given input', () => {
    const target = characters(
      assign('Alpha', block([])),
      assign('Bravo', block([])),
      assign('Charlie', block([])),
    );

    const first = extractCharacters(target);
    const second = extractCharacters(target);

    expect(first.map((entity) => entity.token)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
    expect(first).toEqual(second);
  });
});
