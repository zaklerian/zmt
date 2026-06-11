import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  BooleanValueNode,
  IdentifierNode,
  OperatorNode,
  ParadoxValue,
  StringValueNode,
} from '@paradox-parser';

import { describe, expect, it } from 'vitest';

import { extractSlots } from './extract-slots.util';

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

function id(name: string): IdentifierNode {
  return { ...base(), kind: 'Identifier', name };
}

function op(): OperatorNode {
  return { ...base(), kind: 'Operator', opKind: 'eq' };
}

function str(value: string): StringValueNode {
  return { ...base(), kind: 'StringValue', raw: `"${value}"`, value };
}

describe('extractSlots', () => {
  it('projects module_slots with name, required, and allowed categories', () => {
    const archetype = block([
      assign('is_archetype', bool(true)),
      assign(
        'module_slots',
        block([
          assign(
            'fixed_main_weapon',
            block([
              assign('required', bool(true)),
              assign(
                'allowed_module_categories',
                block([id('fixed_air_weapon'), id('engine')]),
              ),
            ]),
          ),
          assign(
            'engine_slot',
            block([
              assign('allowed_module_categories', block([id('air_engine')])),
            ]),
          ),
        ]),
      ),
    ]);

    expect(extractSlots(archetype).slots).toEqual([
      {
        allowedCategories: ['fixed_air_weapon', 'engine'],
        name: 'fixed_main_weapon',
        required: true,
      },
      {
        allowedCategories: ['air_engine'],
        name: 'engine_slot',
        required: false,
      },
    ]);
  });

  it('defaults required to false when the slot omits the key', () => {
    const archetype = block([
      assign('module_slots', block([assign('special_slot', block([]))])),
    ]);

    expect(extractSlots(archetype).slots).toEqual([
      { allowedCategories: [], name: 'special_slot', required: false },
    ]);
  });

  it('returns an empty slot list when module_slots is absent', () => {
    const archetype = block([assign('is_archetype', bool(true))]);

    expect(extractSlots(archetype).slots).toEqual([]);
  });

  it('projects default_modules to slot-keyed assignments', () => {
    const archetype = block([
      assign(
        'default_modules',
        block([
          assign('fixed_main_weapon', id('light_mg')),
          assign('engine_slot', str('engine_1')),
        ]),
      ),
    ]);

    expect(extractSlots(archetype).assignments).toEqual([
      { key: 'fixed_main_weapon', value: 'light_mg' },
      { key: 'engine_slot', value: 'engine_1' },
    ]);
  });

  it('returns empty assignments when default_modules is absent', () => {
    const archetype = block([assign('is_archetype', bool(true))]);

    expect(extractSlots(archetype).assignments).toEqual([]);
  });
});
