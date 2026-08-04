import { describe, expect, it } from 'vitest';

import type { ParadoxNode, PercentValueNode } from './paradox-node.model';

import { parse } from './parse';
import { serialize } from './serialize.util';

// ZMT-37: `%`/`%%` GUI dimension literals. The enumeration over BICE's
// `interface/*.gui` + `gfx/*.gfx` found these — not the prompt's `rgb {…}`/`hsv
// {…}` keyword tuples, which do not occur in the corpus (`rgb = {…}` is an
// ordinary assignment and already parsed) — as the percent/color-shaped family
// blocking `.gui`/`.gfx` parsing (~61.3k errors across 559 files → 0).
//
// Percent lives in the BASE grammar (no dialect flag), mirroring `SymbolValue`
// (`@NAME`): both are unambiguous — a trailing `%` is never valid otherwise — so
// neither needs gating. Only genuinely-ambiguous `@[ … ]` stays dialect-gated.

function firstValue(source: string): PercentValueNode {
  const script = parse(source);
  expect(script.errors).toEqual([]);
  const assignment = script.children[0];
  if (assignment?.kind !== 'Assignment') {
    throw new Error('fixture invariant: source must start with an assignment');
  }
  if (assignment.value.kind !== 'PercentValue') {
    throw new Error('expected a PercentValue');
  }
  return assignment.value;
}

function nodesOfKind(
  root: ParadoxNode,
  kind: ParadoxNode['kind'],
  out: ParadoxNode[] = [],
): ParadoxNode[] {
  if (root.kind === kind) out.push(root);
  if (root.kind === 'Assignment') {
    nodesOfKind(root.key, kind, out);
    nodesOfKind(root.value, kind, out);
  }
  if (root.kind === 'Block' || root.kind === 'Script') {
    for (const child of root.children) nodesOfKind(child, kind, out);
  }
  return out;
}

describe('percent literals (ZMT-37)', () => {
  it('parses a single-percent value with its numeric part and unit', () => {
    const node = firstValue('width = 90%\n');
    expect(node.raw).toBe('90%');
    expect(node.unit).toBe('%');
    expect(node.value).toBe(90);
  });

  it('parses a double-percent value, keeping the `%%` unit distinct', () => {
    const node = firstValue('height = 100%%\n');
    expect(node.raw).toBe('100%%');
    expect(node.unit).toBe('%%');
    expect(node.value).toBe(100);
  });

  it('parses a negative percent value', () => {
    const node = firstValue('width = -100%\n');
    expect(node.raw).toBe('-100%');
    expect(node.unit).toBe('%');
    expect(node.value).toBe(-100);
  });

  it('admits percent as a bare list item, not only an assignment value', () => {
    const source = 'ratios = { 25% 50%% 99% }\n';
    const script = parse(source);
    expect(script.errors).toEqual([]);
    const block = script.children[0];
    if (block?.kind !== 'Assignment' || block.value.kind !== 'Block') {
      throw new Error('fixture invariant: ratios must be a Block');
    }
    expect(block.value.children.map((c) => c.kind)).toEqual([
      'PercentValue',
      'PercentValue',
      'PercentValue',
    ]);
  });

  it('round-trips every percent form byte-for-byte', () => {
    for (const source of [
      'width = 90%\n',
      'height = 100%%\n',
      'x = -100%\n',
      'size = { width = 100% height = 100%% }\n',
      'pad = {width=0% height=48%%}\n',
    ]) {
      const script = parse(source);
      expect(script.errors).toEqual([]);
      expect(serialize(script, source)).toBe(source);
    }
  });

  it('is base-grammar: percent parses with NO dialect flag (like @NAME)', () => {
    const source = 'size = { width = 90% height = 90%% }\n';
    const withoutDialect = parse(source);
    const withDialect = parse(source, { dialects: ['hoi4_bracket_expr'] });
    expect(withoutDialect.errors).toEqual([]);
    expect(withDialect.errors).toEqual([]);
    expect(nodesOfKind(withoutDialect, 'PercentValue')).toHaveLength(2);
  });

  it('re-emits a dirtied percent node from its canonical form', () => {
    const source = 'width = 90%\n';
    const script = parse(source);
    const assignment = script.children[0];
    if (
      assignment?.kind !== 'Assignment' ||
      assignment.value.kind !== 'PercentValue'
    ) {
      throw new Error('fixture invariant');
    }
    // Drop `raw` and dirty the node: canonical emission reconstructs value+unit.
    assignment.value.raw = '';
    assignment.value.value = 75;
    assignment.value.unit = '%%';
    assignment.value.dirty = true;
    assignment.dirty = true;
    script.dirty = true;
    expect(serialize(script, source)).toBe('width = 75%%\n');
  });
});

// Gate item 4: the E24 `@`-family must not regress under the percent addition —
// they share the numeric/token space (`@1933` numeric symbol, `-100%` numeric
// percent). A focused restatement alongside the untouched substitution specs.
describe('percent addition does not regress the @-family (ZMT-37 gate 4)', () => {
  it('keeps @NAME definition + reference resolving', () => {
    const source = '@FTR = 4\nspeed = @FTR\n';
    const script = parse(source);
    expect(script.errors).toEqual([]);
    const refs = nodesOfKind(script, 'SymbolValue');
    expect(refs).toHaveLength(1);
    expect((refs[0] as { resolved: null | string }).resolved).toBe('4');
  });

  it('keeps @[ expr ] a bracket expression under its dialect', () => {
    const source = 'speed = @[ base/2 ]\n';
    const script = parse(source, { dialects: ['hoi4_bracket_expr'] });
    expect(script.errors).toEqual([]);
    expect(serialize(script, source)).toBe(source);
  });

  it('keeps variable@token a single identifier', () => {
    const source = 'x = ai_variant_level@fighter_equipment\n';
    const script = parse(source);
    expect(script.errors).toEqual([]);
    const ids = nodesOfKind(script, 'Identifier').map(
      (n) => (n as { name: string }).name,
    );
    expect(ids).toContain('ai_variant_level@fighter_equipment');
  });
});
