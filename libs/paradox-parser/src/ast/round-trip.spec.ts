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
