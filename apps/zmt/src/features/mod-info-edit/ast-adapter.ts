import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  IdentifierNode,
  ParadoxValue,
  Script,
  StringValueNode,
} from '@paradox-parser';

import { z } from 'zod';

import type { ResolvedModDescriptorSchema } from './mod-info-edit.model';

type FieldKind = 'boolean' | 'number' | 'string-array' | 'string' | 'unknown';

interface ZodDefLike {
  readonly innerType?: z.ZodTypeAny;
  readonly type?: z.ZodTypeAny;
  readonly typeName?: string;
}

export function applyFormValuesToAst(
  script: Script,
  values: Readonly<Record<string, unknown>>,
  schema: ResolvedModDescriptorSchema,
): void {
  const shape = schema.shape;
  const assignments = indexAssignments(script);
  const defaults = schema.parse({}) as Record<string, unknown>;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const kind = classifyField(fieldSchema);
    if (kind === 'unknown') continue;
    if (!(key in values)) continue;
    const formValue = values[key];

    const existing = assignments.get(key);
    if (existing !== undefined) {
      const current = extractByKind(existing.value, kind);
      if (valuesEqual(current, formValue, kind)) continue;
      applyToExistingAssignment(existing, kind, formValue);
      script.dirty = true;
      continue;
    }

    if (valuesEqual(defaults[key], formValue, kind)) continue;
    const valueNode = buildValueNode(kind, formValue);
    if (valueNode === null) continue;
    const newAssignment = makeAssignment(key, valueNode);
    const children = script.children;
    children.push(newAssignment);
    script.dirty = true;
  }
}

export function astToFormValues(
  script: Script,
  schema: ResolvedModDescriptorSchema,
): Record<string, unknown> {
  const shape = schema.shape;
  const assignments = indexAssignments(script);
  const collected: Record<string, unknown> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const assignment = assignments.get(key);
    if (assignment === undefined) continue;
    const kind = classifyField(fieldSchema);
    const value = extractByKind(assignment.value, kind);
    if (value !== undefined) collected[key] = value;
  }

  return schema.parse(collected) as Record<string, unknown>;
}

function applyToExistingAssignment(
  assignment: AssignmentNode,
  kind: FieldKind,
  value: unknown,
): void {
  switch (kind) {
    case 'boolean': {
      if (assignment.value.kind === 'BooleanValue') {
        assignment.value.value = value === true;
        markAncestorsDirty(assignment.value, assignment);
        return;
      }
      const node = buildValueNode('boolean', value);
      if (node !== null) {
        assignment.value = node;
        markAncestorsDirty(assignment);
      }
      return;
    }
    case 'number': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (assignment.value.kind === 'NumberValue') {
        assignment.value.value = Number.isFinite(numeric) ? numeric : 0;
        assignment.value.raw = '';
        markAncestorsDirty(assignment.value, assignment);
        return;
      }
      const node = buildValueNode('number', value);
      if (node !== null) {
        assignment.value = node;
        markAncestorsDirty(assignment);
      }
      return;
    }
    case 'string': {
      const next = String(value ?? '');
      if (assignment.value.kind === 'StringValue') {
        assignment.value.value = next;
        assignment.value.raw = '';
        markAncestorsDirty(assignment.value, assignment);
        return;
      }
      assignment.value = makeStringValue(next);
      markAncestorsDirty(assignment);
      return;
    }
    case 'string-array': {
      const items = Array.isArray(value) ? (value as readonly string[]) : [];
      if (assignment.value.kind === 'Block') {
        updateStringArrayBlockInPlace(assignment.value, items);
        markAncestorsDirty(assignment);
        return;
      }
      assignment.value = makeStringArrayBlock(items);
      markAncestorsDirty(assignment);
      return;
    }
    case 'unknown':
      return;
  }
}

function buildValueNode(kind: FieldKind, value: unknown): null | ParadoxValue {
  switch (kind) {
    case 'boolean':
      return {
        dirty: true,
        from: 0,
        kind: 'BooleanValue',
        leadingTrivia: emptyTrivia(),
        to: 0,
        trailingTrivia: emptyTrivia(),
        value: value === true,
      };
    case 'number': {
      const numeric = typeof value === 'number' ? value : Number(value);
      const raw = Number.isFinite(numeric) ? String(numeric) : '0';
      return {
        dirty: true,
        from: 0,
        kind: 'NumberValue',
        leadingTrivia: emptyTrivia(),
        raw,
        to: 0,
        trailingTrivia: emptyTrivia(),
        value: Number.isFinite(numeric) ? numeric : 0,
      };
    }
    case 'string':
      return makeStringValue(String(value ?? ''));
    case 'string-array':
      return makeStringArrayBlock(
        Array.isArray(value) ? (value as readonly string[]) : [],
      );
    case 'unknown':
      return null;
  }
}

function classifyField(schema: z.ZodTypeAny): FieldKind {
  const inner = unwrap(schema);
  const name = getDef(inner).typeName;
  if (name === 'ZodString') return 'string';
  if (name === 'ZodNumber') return 'number';
  if (name === 'ZodBoolean') return 'boolean';
  if (name === 'ZodArray') {
    const elem = getDef(inner).type;
    if (elem !== undefined && getDef(unwrap(elem)).typeName === 'ZodString') {
      return 'string-array';
    }
  }
  return 'unknown';
}

function emptyTrivia(): [] {
  return [];
}

function extractBoolean(value: ParadoxValue): boolean {
  if (value.kind === 'BooleanValue') return value.value;
  if (value.kind === 'StringValue') return value.value === 'yes';
  if (value.kind === 'Identifier') return value.name === 'yes';
  return false;
}

function extractByKind(value: ParadoxValue, kind: FieldKind): unknown {
  switch (kind) {
    case 'boolean':
      return extractBoolean(value);
    case 'number':
      return extractNumber(value);
    case 'string':
      return extractString(value);
    case 'string-array':
      return extractStringArray(value);
    case 'unknown':
      return undefined;
  }
}

function extractNumber(value: ParadoxValue): number {
  if (value.kind === 'NumberValue') return value.value;
  if (value.kind === 'StringValue') {
    const parsed = Number(value.value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function extractString(value: ParadoxValue): string {
  switch (value.kind) {
    case 'Block':
      return '';
    case 'BooleanValue':
      return value.value ? 'yes' : 'no';
    case 'DateValue':
      return value.raw;
    case 'Identifier':
      return value.name;
    case 'NumberValue':
      return value.raw;
    case 'StringValue':
      return value.value;
    case 'SymbolValue':
      return value.resolved ?? `@${value.name}`;
  }
}

function extractStringArray(value: ParadoxValue): string[] {
  if (value.kind !== 'Block') return [];
  const out: string[] = [];
  for (const child of value.children) {
    if (child.kind === 'StringValue') out.push(child.value);
    else if (child.kind === 'Identifier') out.push(child.name);
  }
  return out;
}

function getDef(schema: z.ZodTypeAny): ZodDefLike {
  return schema._def as ZodDefLike;
}

function indexAssignments(script: Script): ReadonlyMap<string, AssignmentNode> {
  const out = new Map<string, AssignmentNode>();
  for (const child of script.children) {
    if (child.kind === 'Assignment') out.set(keyName(child.key), child);
  }
  return out;
}

function keyName(key: AssignmentNode['key']): string {
  return key.kind === 'StringValue' ? key.value : key.name;
}

function makeAssignment(key: string, value: ParadoxValue): AssignmentNode {
  return {
    dirty: true,
    from: 0,
    key: makeIdentifier(key),
    kind: 'Assignment',
    leadingTrivia: [{ from: 0, kind: 'Whitespace', text: '\n', to: 0 }],
    operator: {
      dirty: true,
      from: 0,
      kind: 'Operator',
      leadingTrivia: emptyTrivia(),
      opKind: 'eq',
      to: 0,
      trailingTrivia: emptyTrivia(),
    },
    to: 0,
    trailingTrivia: emptyTrivia(),
    value,
  };
}

function makeIdentifier(name: string): IdentifierNode {
  return {
    dirty: true,
    from: 0,
    kind: 'Identifier',
    leadingTrivia: emptyTrivia(),
    name,
    to: 0,
    trailingTrivia: emptyTrivia(),
  };
}

function makeStringArrayBlock(items: readonly string[]): BlockNode {
  const children: BlockChild[] = items.map((item) => makeStringValue(item));
  return {
    children,
    dirty: true,
    from: 0,
    innerLeadingTrivia: emptyTrivia(),
    innerTrailingTrivia: emptyTrivia(),
    kind: 'Block',
    leadingTrivia: emptyTrivia(),
    to: 0,
    trailingTrivia: emptyTrivia(),
  };
}

function makeStringValue(value: string): StringValueNode {
  return {
    dirty: true,
    from: 0,
    kind: 'StringValue',
    leadingTrivia: emptyTrivia(),
    raw: '',
    to: 0,
    trailingTrivia: emptyTrivia(),
    value,
  };
}

function markAncestorsDirty(...nodes: readonly { dirty: boolean }[]): void {
  for (const node of nodes) node.dirty = true;
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  const def = getDef(schema);
  const name = def.typeName;
  if (
    (name === 'ZodDefault' ||
      name === 'ZodOptional' ||
      name === 'ZodNullable') &&
    def.innerType !== undefined
  ) {
    return unwrap(def.innerType);
  }
  return schema;
}

function updateStringArrayBlockInPlace(
  block: BlockNode,
  newItems: readonly string[],
): void {
  const remaining = [...newItems];
  const nextChildren: BlockChild[] = [];
  for (const child of block.children) {
    if (child.kind === 'StringValue' || child.kind === 'Identifier') {
      const currentValue =
        child.kind === 'StringValue' ? child.value : child.name;
      const idx = remaining.indexOf(currentValue);
      if (idx !== -1) {
        nextChildren.push(child);
        remaining.splice(idx, 1);
        continue;
      }
      continue;
    }
    nextChildren.push(child);
  }
  for (const item of remaining) {
    const node = makeStringValue(item);
    node.leadingTrivia = [{ from: 0, kind: 'Whitespace', text: '\n', to: 0 }];
    nextChildren.push(node);
  }
  block.children = nextChildren;
  block.dirty = true;
}

function valuesEqual(a: unknown, b: unknown, kind: FieldKind): boolean {
  if (kind === 'string-array') {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === b;
}
