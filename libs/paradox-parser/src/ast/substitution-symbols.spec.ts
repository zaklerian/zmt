import { describe, expect, it } from 'vitest';

import type {
  ParadoxNode,
  Script,
  SymbolValueNode,
} from './paradox-node.model';

import { parse } from './parse';
import { serialize } from './serialize.util';

function firstAssignment(script: Script) {
  const child = script.children[0];
  if (child === undefined || child.kind !== 'Assignment') {
    throw new Error('expected leading assignment');
  }
  return child;
}

function symbolNodes(root: ParadoxNode, out: SymbolValueNode[] = []): SymbolValueNode[] {
  if (root.kind === 'SymbolValue') out.push(root);
  if (root.kind === 'Assignment') {
    symbolNodes(root.key, out);
    symbolNodes(root.value, out);
  }
  if (root.kind === 'Block' || root.kind === 'Script') {
    for (const child of root.children) symbolNodes(child, out);
  }
  return out;
}

describe('substitution constants (ADR 022)', () => {
  it('resolves a reference to the same-file definition literal, keeping symbol + byte range', () => {
    const source = '@1933 = 100\ny = @1933\n';
    const script = parse(source);

    expect(script.errors).toEqual([]);

    const referenceAssignment = script.children[1];
    if (referenceAssignment?.kind !== 'Assignment') {
      throw new Error('expected reference assignment');
    }
    const reference = referenceAssignment.value;
    expect(reference.kind).toBe('SymbolValue');
    if (reference.kind !== 'SymbolValue') return;
    // sigil stripped on the AST name…
    expect(reference.name).toBe('1933');
    // …resolved to the definition's literal, NOT the incidental numeric name…
    expect(reference.resolved).toBe('100');
    // …and the verbatim `@1933` is preserved as the source byte range.
    expect(source.slice(reference.from, reference.to)).toBe('@1933');
  });

  it('models the definition key as a SymbolValue node carrying the stripped name', () => {
    const script = parse('@FTR_START = -5\n');
    const definition = firstAssignment(script);

    expect(definition.key.kind).toBe('SymbolValue');
    if (definition.key.kind !== 'SymbolValue') return;
    expect(definition.key.name).toBe('FTR_START');
    expect(definition.key.resolved).toBe('-5');
  });

  it('resolves a reference that precedes its definition (per-file table, not lazy)', () => {
    const script = parse('y = @LATE\n@LATE = 7\n');
    expect(script.errors).toEqual([]);
    const reference = firstAssignment(script).value;
    expect(reference.kind === 'SymbolValue' && reference.resolved).toBe('7');
  });

  it('emits a diagnostic for a reference with no same-file definition (no invented fallback)', () => {
    const script = parse('y = @MISSING\n');
    expect(script.errors.length).toBeGreaterThan(0);
    expect(script.errors[0].message).toContain('@MISSING');
    const reference = firstAssignment(script).value;
    expect(reference.kind === 'SymbolValue' && reference.resolved).toBeNull();
  });

  it('round-trips a symbol-bearing source byte-for-byte', () => {
    const source =
      '@1933 = 100\n@FTR_START = -5\ntechnologies = {\n\tinfantry = {\n\t\tfolder = {\n\t\t\tposition = { x = @FTR_START y = @1933 }\n\t\t}\n\t}\n}\n';
    const script = parse(source);
    expect(script.errors).toEqual([]);
    expect(serialize(script, source)).toBe(source);
    // both the two definition keys and the two references surface as symbols.
    expect(symbolNodes(script)).toHaveLength(4);
  });

  it('leaves `@[ expr ]` bracket arithmetic unchanged (dialect-gated, no SymbolValue)', () => {
    const source = 'speed = @[base/2]\n';
    const withDialect = parse(source, { dialects: ['hoi4_bracket_expr'] });

    expect(withDialect.errors).toEqual([]);
    expect(serialize(withDialect, source)).toBe(source);
    expect(symbolNodes(withDialect)).toHaveLength(0);
    const value = firstAssignment(withDialect).value;
    // adapts through the existing BracketExpression → Identifier path.
    expect(value.kind).toBe('Identifier');

    // Without the dialect flag it still errors, exactly as before.
    expect(parse(source).errors.length).toBeGreaterThan(0);
  });

  it('lexes `variable@token` runtime indexing as ONE identifier (sigil interior, not leading)', () => {
    const source = 'level = ai_variant_level@fighter_equipment\n';
    const script = parse(source);

    expect(script.errors).toEqual([]);
    expect(serialize(script, source)).toBe(source);
    expect(symbolNodes(script)).toHaveLength(0);

    const value = firstAssignment(script).value;
    expect(value.kind).toBe('Identifier');
    expect(value.kind === 'Identifier' && value.name).toBe(
      'ai_variant_level@fighter_equipment',
    );
  });
});
