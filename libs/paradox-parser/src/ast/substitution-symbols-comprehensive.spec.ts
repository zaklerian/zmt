import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ParadoxNode } from './paradox-node.model';

import { parse } from './parse';
import { serialize } from './serialize.util';

// One in-repo fixture exercising EVERY `@`-related construct in a single file
// (ADR 022 regression gate, R3): a `@NAME` definition at root and inside a block,
// a resolving reference, a NON-resolving reference (diagnostic), `@[ expr ]`
// bracket arithmetic, and `variable@token` interior-sigil indexing. It is NOT a
// substitute for the real-corpus gates 2/3 — it proves the grammar handles the
// constructs losslessly, not that the fix holds across the shipped mod.
//
// Lives in a subdirectory so the flat round-trip fixture harness does not
// auto-discover it: it must be parsed WITH the bracket dialect and it carries one
// intentional diagnostic, both of which the standard harness forbids.
const SOURCE = readFileSync(
  join(import.meta.dirname, '__fixtures__', 'comprehensive', 'all-at-symbols.mod'),
  'utf-8',
);

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

describe('comprehensive substitution fixture (ADR 022, R3)', () => {
  it('round-trips byte-for-byte through parse → serialize with every construct present', () => {
    const script = parse(SOURCE, { dialects: ['hoi4_bracket_expr'] });

    // Byte-identity holds even though one reference is unresolved — serialization
    // is a verbatim slice, independent of diagnostics.
    expect(serialize(script, SOURCE)).toBe(SOURCE);

    // Definitions at root (@FTR_START, @1933) and in a block (@LOCAL).
    const definitions = nodesOfKind(script, 'SymbolDefinition');
    expect(definitions.map((node) => (node as { name: string }).name).sort()).toEqual(
      ['1933', 'FTR_START', 'LOCAL'],
    );

    // References: @LOCAL, @FTR_START, @1933 (resolving) + @UNDEFINED (not).
    const references = nodesOfKind(script, 'SymbolValue');
    expect(references).toHaveLength(4);
  });

  it('records exactly one diagnostic — the non-resolving reference — and no fabricated value', () => {
    const script = parse(SOURCE, { dialects: ['hoi4_bracket_expr'] });

    expect(script.errors).toHaveLength(1);
    expect(script.errors[0].message).toContain('@UNDEFINED');

    const references = nodesOfKind(script, 'SymbolValue');
    const unresolved = references.filter(
      (node) => (node as { resolved: null | string }).resolved === null,
    );
    expect(unresolved).toHaveLength(1);
    expect((unresolved[0] as { name: string }).name).toBe('UNDEFINED');
  });

  it('leaves `@[ expr ]` and `variable@token` as their own tokens, not substitution symbols', () => {
    const script = parse(SOURCE, { dialects: ['hoi4_bracket_expr'] });

    // `@[ 1 + 2 ]` adapts through BracketExpression → Identifier; it is NOT a
    // SymbolValue and does NOT resolve against the symbol table.
    const identifiers = nodesOfKind(script, 'Identifier').map(
      (node) => (node as { name: string }).name,
    );
    expect(identifiers).toContain('@[ 1 + 2 ]');
    // `variable@token` is one identifier, not `variable` + a symbol.
    expect(identifiers).toContain('variable@token');
  });
});
