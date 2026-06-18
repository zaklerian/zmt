import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AssignmentNode, StringValueNode } from './paradox-node.model';

import { parse } from './parse';
import { serialize } from './serialize.util';

const FIXTURES_DIR = join(import.meta.dirname, '__fixtures__');

function listFixtures(): readonly string[] {
  return readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.mod'))
    .sort();
}

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('round-trip (parse → serialize)', () => {
  for (const name of listFixtures()) {
    it(`re-emits ${name} byte-for-byte`, () => {
      const source = readFixture(name);
      const script = parse(source);
      expect(script.errors).toEqual([]);
      expect(serialize(script, source)).toBe(source);
    });
  }
});

describe('mutation preserves surrounding trivia', () => {
  it('canonicalises only the mutated assignment, leaves comments intact', () => {
    const source = readFixture('with-comments.mod');
    const script = parse(source);
    expect(script.errors).toEqual([]);

    const target = script.children[0];
    if (target === undefined || target.kind !== 'Assignment') {
      throw new Error(
        'fixture invariant: with-comments.mod must start with an Assignment',
      );
    }
    const assignment: AssignmentNode = target;
    const originalValue = assignment.value;
    if (originalValue.kind !== 'StringValue') {
      throw new Error(
        'fixture invariant: first assignment value must be a StringValue',
      );
    }

    const newValue: StringValueNode = {
      dirty: true,
      from: originalValue.from,
      kind: 'StringValue',
      leadingTrivia: [],
      raw: '"Renamed Mod"',
      to: originalValue.to,
      trailingTrivia: [],
      value: 'Renamed Mod',
    };
    assignment.value = newValue;
    assignment.dirty = true;
    script.dirty = true;

    const output = serialize(script, source);

    expect(output).not.toBe(source);
    expect(output).toContain('"Renamed Mod"');
    expect(output).not.toContain('"Commented Mod"');
    expect(output).toContain('# Mod descriptor with surrounding comments');
    expect(output).toContain('# inline trailing comment');
    expect(output).toContain('# Standalone comment between assignments');
    expect(output).toContain('version="1.2.3"');
    expect(output).toContain('supported_version="1.16.4"');
  });
});

describe('large-file scale (ZMT-E10)', () => {
  it('parses and round-trips a flat equipment_modules block with thousands of entries', () => {
    const entryCount = 6000;
    const lines = ['equipment_modules={'];
    for (let i = 0; i < entryCount; i += 1) {
      lines.push(`\tmodule_${i}=enabled`);
    }
    lines.push('}');
    const source = `${lines.join('\n')}\n`;

    const script = parse(source);

    expect(script.errors).toEqual([]);
    expect(serialize(script, source)).toBe(source);
  });
});

describe('numeric assignment keys (ZMT-15)', () => {
  // A numeric key (e.g. a naval_base province id) is admitted as an assignment
  // Key and adapts to an Identifier node carrying the raw digits; a bare numeric
  // value with no operator stays a value (no spurious assignment).
  const NAVAL_SOURCE = 'naval_base={\n\t1234=1\n\t5678=2\n}\n';

  it('parses a numeric key as an assignment and round-trips it byte-for-byte', () => {
    const script = parse(NAVAL_SOURCE);

    expect(script.errors).toEqual([]);
    expect(serialize(script, NAVAL_SOURCE)).toBe(NAVAL_SOURCE);

    const block = script.children[0];
    if (block === undefined || block.kind !== 'Assignment') {
      throw new Error(
        'fixture invariant: NAVAL_SOURCE must start with a block',
      );
    }
    if (block.value.kind !== 'Block') {
      throw new Error('fixture invariant: naval_base must be a Block');
    }
    const entry = block.value.children[0];
    if (entry === undefined || entry.kind !== 'Assignment') {
      throw new Error('fixture invariant: first child must be an Assignment');
    }
    expect(entry.key.kind).toBe('Identifier');
    expect(
      entry.key.kind === 'Identifier' ? entry.key.name : entry.key.value,
    ).toBe('1234');
  });

  it('keeps bare numeric values (no operator) as values, not keys', () => {
    const source = 'provinces={\n\t1 2 3\n}\n';
    const script = parse(source);

    expect(script.errors).toEqual([]);
    expect(serialize(script, source)).toBe(source);

    const block = script.children[0];
    if (block?.kind !== 'Assignment' || block.value.kind !== 'Block') {
      throw new Error('fixture invariant: provinces must be a Block');
    }
    expect(
      block.value.children.every((child) => child.kind === 'NumberValue'),
    ).toBe(true);
  });
});

describe('dialect flags', () => {
  const BRACKET_SOURCE = 'speed=@[base/2]\n';

  it('rejects HOI4 bracket expressions without the dialect flag', () => {
    const script = parse(BRACKET_SOURCE);
    expect(script.errors.length).toBeGreaterThan(0);
  });

  it('accepts HOI4 bracket expressions with hoi4_bracket_expr enabled', () => {
    const script = parse(BRACKET_SOURCE, {
      dialects: ['hoi4_bracket_expr'],
    });
    expect(script.errors).toEqual([]);
    expect(serialize(script, BRACKET_SOURCE)).toBe(BRACKET_SOURCE);
  });
});
