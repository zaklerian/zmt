import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  Script,
} from '@paradox-parser';

export function buildArchetypeIndex(
  parsedFiles: readonly Script[],
): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, readonly string[]>();
  for (const file of parsedFiles) {
    for (const entry of equipmentEntries(file)) {
      const tokens = directTypeTokens(entry);
      if (tokens !== null) {
        index.set(keyName(entry), tokens);
      }
    }
  }
  return index;
}

function directTypeTokens(entry: AssignmentNode): null | readonly string[] {
  if (entry.value.kind !== 'Block') {
    return null;
  }
  const type = findAssignment(entry.value, 'type');
  if (type === undefined) {
    return null;
  }
  if (type.value.kind === 'Block') {
    const tokens: string[] = [];
    for (const child of type.value.children) {
      const token = tokenOf(child);
      if (token !== undefined) {
        tokens.push(token);
      }
    }
    return tokens;
  }
  const token = tokenOf(type.value);
  return token === undefined ? [] : [token];
}

function equipmentEntries(file: Script): readonly AssignmentNode[] {
  const entries: AssignmentNode[] = [];
  for (const child of file.children) {
    if (
      child.kind !== 'Assignment' ||
      child.value.kind !== 'Block' ||
      keyName(child) !== 'equipments'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind === 'Assignment') {
        entries.push(entry);
      }
    }
  }
  return entries;
}

function findAssignment(
  block: BlockNode,
  key: string,
): AssignmentNode | undefined {
  for (const child of block.children) {
    if (child.kind === 'Assignment' && keyName(child) === key) {
      return child;
    }
  }
  return undefined;
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

function tokenOf(node: BlockChild): string | undefined {
  if (node.kind === 'Identifier') {
    return node.name;
  }
  if (node.kind === 'StringValue') {
    return node.value;
  }
  if (node.kind === 'SymbolValue') {
    return node.resolved ?? `@${node.name}`;
  }
  return undefined;
}
