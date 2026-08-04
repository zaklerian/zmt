import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  BooleanValueNode,
  DateValueNode,
  IdentifierNode,
  NumberValueNode,
  OperatorKind,
  OperatorNode,
  ParadoxNode,
  PercentValueNode,
  Script,
  StringValueNode,
  SymbolValueNode,
  Trivia,
} from './paradox-node.model';

const INDENT_UNIT = '\t';

const OPERATOR_SYMBOL: Readonly<Record<OperatorKind, string>> = {
  eq: '=',
  ge: '>=',
  gt: '>',
  le: '<=',
  lt: '<',
  ne: '!=',
};

export function serialize(root: Script, source: string): string {
  return serializeScript(root, source);
}

function canonicalAssignment(
  node: AssignmentNode,
  source: string,
  indent: number,
): string {
  const key = serializeNode(node.key, source, indent);
  const operator = canonicalOperator(node.operator);
  const value = serializeNode(node.value, source, indent);
  return `${key} ${operator} ${value}`;
}

function canonicalBlock(
  node: BlockNode,
  source: string,
  indent: number,
): string {
  if (node.children.length === 0) {
    return `{${emitTrivia(node.innerLeadingTrivia)}${emitTrivia(node.innerTrailingTrivia) || ' '}}`;
  }

  const multiline = node.children.some(isMultilineChild);

  if (!multiline) {
    const parts: string[] = [];
    for (const child of node.children) {
      parts.push(serializeNode(child, source, indent));
    }
    return `{ ${parts.join(' ')} }`;
  }

  const childIndent = indent + 1;
  const childPrefix = INDENT_UNIT.repeat(childIndent);
  const closeIndent = INDENT_UNIT.repeat(indent);
  const lines: string[] = node.children.map(
    (child) => `${childPrefix}${serializeNode(child, source, childIndent)}`,
  );
  return `{\n${lines.join('\n')}\n${closeIndent}}`;
}

function canonicalBody(
  node: ParadoxNode,
  source: string,
  indent: number,
): string {
  switch (node.kind) {
    case 'Assignment':
      return canonicalAssignment(node, source, indent);
    case 'Block':
      return canonicalBlock(node, source, indent);
    case 'BooleanValue':
      return canonicalBoolean(node);
    case 'DateValue':
      return canonicalDate(node);
    case 'Identifier':
      return canonicalIdentifier(node);
    case 'NumberValue':
      return canonicalNumber(node);
    case 'Operator':
      return canonicalOperator(node);
    case 'OrphanComment':
      return node.text;
    case 'PercentValue':
      return canonicalPercent(node);
    case 'Script':
      return serializeScript(node, source);
    case 'StringValue':
      return canonicalString(node);
    case 'SymbolDefinition':
      return `@${node.name}`;
    case 'SymbolValue':
      return canonicalSymbol(node);
  }
}

function canonicalBoolean(node: BooleanValueNode): string {
  return node.value ? 'yes' : 'no';
}

function canonicalDate(node: DateValueNode): string {
  return node.raw !== '' ? node.raw : `${node.year}.${node.month}.${node.day}`;
}

function canonicalIdentifier(node: IdentifierNode): string {
  return node.name;
}

function canonicalNumber(node: NumberValueNode): string {
  return node.raw !== '' ? node.raw : node.value.toString();
}

function canonicalOperator(node: OperatorNode): string {
  return OPERATOR_SYMBOL[node.opKind];
}

// A dimension literal re-emits its numeric part + unit (`90%`, `100%%`). Only
// reached for a dirtied node; an untouched one round-trips via the byte-slice.
function canonicalPercent(node: PercentValueNode): string {
  return node.raw !== '' ? node.raw : `${node.value}${node.unit}`;
}

function canonicalString(node: StringValueNode): string {
  return `"${encodeString(node.value)}"`;
}

// A substitution reference re-emits its sigil + name (`@FTR_START`). Only reached
// for a dirtied node; an untouched one round-trips via the verbatim byte-slice.
function canonicalSymbol(node: SymbolValueNode): string {
  return `@${node.name}`;
}

function emitTrivia(trivia: readonly Trivia[]): string {
  let out = '';
  for (const t of trivia) out += t.text;
  return out;
}

function encodeString(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '\\' || ch === '"') {
      out += '\\' + ch;
    } else if (ch === '\n') {
      out += '\\n';
    } else if (ch === '\t') {
      out += '\\t';
    } else {
      out += ch;
    }
  }
  return out;
}

function isMultilineChild(child: BlockChild): boolean {
  return child.kind === 'Assignment' || child.kind === 'Block';
}

function serializeNode(
  node: ParadoxNode,
  source: string,
  indent: number,
): string {
  const lead = emitTrivia(node.leadingTrivia);
  const trail = emitTrivia(node.trailingTrivia);
  const body = node.dirty
    ? canonicalBody(node, source, indent)
    : source.slice(node.from, node.to);
  return lead + body + trail;
}

function serializeScript(root: Script, source: string): string {
  if (!root.dirty) {
    return source.slice(root.from, root.to);
  }

  let out = '';
  out += emitTrivia(root.leadingTrivia);
  for (const child of root.children) {
    out += serializeNode(child, source, 0);
  }
  out += emitTrivia(root.trailingTrivia);
  return out;
}
