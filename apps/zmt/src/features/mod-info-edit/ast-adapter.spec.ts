import type {
  AssignmentNode,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

import { parse, serialize } from '@paradox-parser';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ResolvedModDescriptorSchema } from './mod-info-edit.model';

import { applyFormValuesToAst, astToFormValues } from './ast-adapter';
import { baseModDescriptorSchema } from './mod-info-edit.schema';

const baseSchema =
  baseModDescriptorSchema as unknown as ResolvedModDescriptorSchema;

function firstAssignment(script: Script, key: string): AssignmentNode {
  for (const child of script.children) {
    if (child.kind !== 'Assignment') continue;
    const childKey =
      child.key.kind === 'Identifier' ? child.key.name : child.key.value;
    if (childKey === key) return child;
  }
  throw new Error(`fixture invariant: assignment "${key}" not found`);
}

function valueOf(assignment: AssignmentNode): ParadoxValue {
  return assignment.value;
}

describe('astToFormValues', () => {
  it('reads a StringValue assignment into a string form field', () => {
    const script = parse('name="Hello"');
    const values = astToFormValues(script, baseSchema);
    expect(values.name).toBe('Hello');
  });

  it('reads a NumberValue assignment into a string form field as raw text', () => {
    const script = parse('version="1.2.3"');
    const values = astToFormValues(script, baseSchema);
    expect(values.version).toBe('1.2.3');
  });

  it('reads an Identifier value as a string (yes/no idioms)', () => {
    const schema = z.object({
      flag: z.string().default(''),
    }) as unknown as ResolvedModDescriptorSchema;
    const script = parse('flag=yes');
    const values = astToFormValues(script, schema);
    expect(values.flag).toBe('yes');
  });

  it('reads a Block of StringValue children into a string-array field', () => {
    const script = parse('tags={ "Balance" "Gameplay" }');
    const values = astToFormValues(script, baseSchema);
    expect(values.tags).toEqual(['Balance', 'Gameplay']);
  });

  it('reads Identifier children inside a Block into a string-array field', () => {
    const script = parse('tags={ Balance Gameplay }');
    const values = astToFormValues(script, baseSchema);
    expect(values.tags).toEqual(['Balance', 'Gameplay']);
  });

  it('fills missing fields from schema defaults rather than throwing', () => {
    const script = parse('name="Only Name"');
    const values = astToFormValues(script, baseSchema);
    expect(values).toMatchObject({
      name: 'Only Name',
      path: '',
      picture: '',
      supported_version: '',
      tags: [],
      version: '',
    });
  });

  it('returns defaults for every field on empty input', () => {
    const script = parse('');
    const values = astToFormValues(script, baseSchema);
    expect(values).toEqual({
      name: '',
      path: '',
      picture: '',
      supported_version: '',
      tags: [],
      version: '',
    });
  });

  it('ignores assignments outside the schema shape (malformed-extra input)', () => {
    const script = parse('name="A"\nunknown_field="ignored"\n');
    const values = astToFormValues(script, baseSchema);
    expect(values).not.toHaveProperty('unknown_field');
    expect(values.name).toBe('A');
  });

  it('coerces a number-typed AST value into a number form field', () => {
    const schema = z.object({
      level: z.number().default(0),
    }) as unknown as ResolvedModDescriptorSchema;
    const script = parse('level=42');
    const values = astToFormValues(script, schema);
    expect(values.level).toBe(42);
  });

  it('coerces a boolean-typed AST value into a boolean form field', () => {
    const schema = z.object({
      enabled: z.boolean().default(false),
    }) as unknown as ResolvedModDescriptorSchema;
    const script = parse('enabled=yes');
    const values = astToFormValues(script, schema);
    expect(values.enabled).toBe(true);
  });
});

describe('applyFormValuesToAst', () => {
  it('updates an existing StringValue assignment in place', () => {
    const script = parse('name="Old"\n');
    applyFormValuesToAst(script, { name: 'New' }, baseSchema);
    const assignment = firstAssignment(script, 'name');
    const value = valueOf(assignment);
    expect(value.kind).toBe('StringValue');
    if (value.kind === 'StringValue') {
      expect(value.value).toBe('New');
    }
    expect(script.dirty).toBe(true);
    expect(assignment.dirty).toBe(true);
  });

  it('leaves the AST clean when the new value equals the existing value', () => {
    const script = parse('name="Same"\n');
    script.dirty = false;
    applyFormValuesToAst(script, { name: 'Same' }, baseSchema);
    expect(script.dirty).toBe(false);
  });

  it('appends a new assignment for a field that does not exist yet', () => {
    const script = parse('name="A"\n');
    applyFormValuesToAst(script, { name: 'A', version: '1.0' }, baseSchema);
    const versionAssignment = firstAssignment(script, 'version');
    const value = valueOf(versionAssignment);
    expect(value.kind).toBe('StringValue');
    if (value.kind === 'StringValue') {
      expect(value.value).toBe('1.0');
    }
    expect(script.dirty).toBe(true);
  });

  it('does not append a new assignment when the value equals the schema default', () => {
    const script = parse('name="A"\n');
    script.dirty = false;
    applyFormValuesToAst(script, { name: 'A', version: '' }, baseSchema);
    expect(script.dirty).toBe(false);
    const hasVersion = script.children.some(
      (child) =>
        child.kind === 'Assignment' &&
        child.key.kind === 'Identifier' &&
        child.key.name === 'version',
    );
    expect(hasVersion).toBe(false);
  });

  it('updates a tags Block surgically — kept children keep their identity', () => {
    const source =
      'tags={\n\t"Balance"  # adds to base game tags\n\t"Old"\n}\n';
    const script = parse(source);
    const tagsAssignment = firstAssignment(script, 'tags');
    const block = valueOf(tagsAssignment) as BlockNode;
    const balanceChild = block.children.find(
      (c) => c.kind === 'StringValue' && c.value === 'Balance',
    );
    if (balanceChild === undefined) {
      throw new Error('fixture invariant: "Balance" child missing');
    }

    applyFormValuesToAst(script, { tags: ['Balance', 'New'] }, baseSchema);

    const updatedBlock = valueOf(firstAssignment(script, 'tags')) as BlockNode;
    const stringChildren = updatedBlock.children.filter(
      (c) => c.kind === 'StringValue',
    );
    expect(stringChildren.map((c) => (c as { value: string }).value)).toEqual([
      'Balance',
      'New',
    ]);

    const retainedBalance = updatedBlock.children.find(
      (c) => c.kind === 'StringValue' && c.value === 'Balance',
    );
    expect(retainedBalance).toBe(balanceChild);
  });

  it('appends to an empty tags block when previously absent', () => {
    const script = parse('name="A"\n');
    applyFormValuesToAst(script, { tags: ['Tag1', 'Tag2'] }, baseSchema);
    const tagsAssignment = firstAssignment(script, 'tags');
    const block = valueOf(tagsAssignment) as BlockNode;
    const values = block.children
      .filter((c) => c.kind === 'StringValue')
      .map((c) => (c as { value: string }).value);
    expect(values).toEqual(['Tag1', 'Tag2']);
  });

  it('does not throw when a form value is missing for a schema field', () => {
    const script = parse('name="A"\n');
    expect(() =>
      applyFormValuesToAst(script, { name: 'B' }, baseSchema),
    ).not.toThrow();
  });

  it('preserves Identifier child trivia when surgically updating a tags block', () => {
    const script = parse('tags={\n\tBalance  # inline\n\tOld\n}\n');
    applyFormValuesToAst(script, { tags: ['Balance'] }, baseSchema);
    const block = valueOf(firstAssignment(script, 'tags')) as BlockNode;
    const balanceStillIdentifier = block.children.find(
      (c) => c.kind === 'Identifier' && c.name === 'Balance',
    );
    expect(balanceStillIdentifier).toBeDefined();
  });

  it('skips fields whose schema type the adapter cannot classify', () => {
    const schema = z.object({
      weird: z.union([z.string(), z.number()]).default('x'),
    }) as unknown as ResolvedModDescriptorSchema;
    const script = parse('weird="left"\n');
    script.dirty = false;
    expect(() =>
      applyFormValuesToAst(script, { weird: 'right' }, schema),
    ).not.toThrow();
    expect(script.dirty).toBe(false);
  });
});

describe('round-trip (astToFormValues → applyFormValuesToAst → astToFormValues)', () => {
  it('reproduces form values after a no-op apply', () => {
    const source =
      'name="Round"\nversion="1.0"\ntags={ "A" "B" }\nsupported_version="1.16"\n';
    const script = parse(source);
    const first = astToFormValues(script, baseSchema);
    applyFormValuesToAst(script, first, baseSchema);
    const second = astToFormValues(script, baseSchema);
    expect(second).toEqual(first);
  });

  it('preserves clean siblings byte-for-byte on a single-field edit', () => {
    const source =
      'name="Original"\nversion="1.0"\ntags={ "A" "B" }\nsupported_version="1.16"\n';
    const script = parse(source);
    const values = astToFormValues(script, baseSchema);
    applyFormValuesToAst(script, { ...values, name: 'Renamed' }, baseSchema);
    const output = serialize(script, source);
    expect(output).toContain('"Renamed"');
    expect(output).toContain('version="1.0"');
    expect(output).toContain('supported_version="1.16"');
    expect(output).toContain('tags={ "A" "B" }');
  });
});
