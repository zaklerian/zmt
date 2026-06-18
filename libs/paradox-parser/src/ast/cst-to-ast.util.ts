import type { SyntaxNode, Tree } from '@lezer/common';

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
  ParadoxValue,
  ParseError,
  Script,
  ScriptChild,
  StringValueNode,
  Trivia,
} from './paradox-node.model';

const OPERATOR_BY_NAME: Readonly<Record<string, OperatorKind>> = {
  Equals: 'eq',
  GreaterEq: 'ge',
  GreaterThan: 'gt',
  LessEq: 'le',
  LessThan: 'lt',
  NotEqual: 'ne',
};

interface AttributionTarget {
  from: number;
  leadingTrivia: Trivia[];
  to: number;
  trailingTrivia: Trivia[];
}

interface CommentRange {
  from: number;
  to: number;
}

export function cstToAst(tree: Tree, source: string): Script {
  const errors: ParseError[] = [];
  const root = tree.topNode;
  // R-CODE-2: build the newline index once and thread it through trivia
  // attribution. lineOf is called per child and per trivia inside every
  // container; a per-call linear scan made attribution O(n²) over source
  // length and froze large flat blocks (e.g. equipment_modules). Binary
  // search against this precomputed index keeps it O(n log n).
  const newlineIndex = buildNewlineIndex(source);
  const children = adaptScriptChildren(root, source, newlineIndex, errors);
  const { leading, trailing } = attributeContainerTrivia(
    root,
    source,
    newlineIndex,
    children,
    root.from,
    root.to,
  );

  let scriptLeading: Trivia[] = [];
  if (children.length > 0 && leading.length > 0) {
    children[0].leadingTrivia.unshift(...leading);
  } else {
    scriptLeading = leading;
  }

  return {
    children,
    dirty: false,
    errors,
    from: root.from,
    kind: 'Script',
    leadingTrivia: scriptLeading,
    to: root.to,
    trailingTrivia: trailing,
  };
}

function adaptAssignment(
  node: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  errors: ParseError[],
): AssignmentNode {
  const keyCst = node.getChild('Key');
  const operatorCst = node.getChild('Operator');
  const valueCst = node.getChild('Value');

  if (keyCst === null || operatorCst === null || valueCst === null) {
    errors.push({
      from: node.from,
      message: 'malformed assignment',
      to: node.to,
    });
  }

  const key =
    keyCst !== null
      ? adaptKey(keyCst, source)
      : placeholderIdentifier(node, source);
  const operator =
    operatorCst !== null
      ? adaptOperator(operatorCst)
      : placeholderOperator(node);
  const value =
    valueCst !== null
      ? adaptValue(valueCst, source, newlineIndex, errors)
      : placeholderIdentifier(node, source);

  return {
    dirty: false,
    from: node.from,
    key,
    kind: 'Assignment',
    leadingTrivia: [],
    operator,
    to: node.to,
    trailingTrivia: [],
    value,
  };
}

function adaptBlock(
  node: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  errors: ParseError[],
): BlockNode {
  const lbrace = node.getChild('LBrace');
  const rbrace = node.getChild('RBrace');
  const innerStart = lbrace !== null ? lbrace.to : node.from + 1;
  const innerEnd = rbrace !== null ? rbrace.from : node.to - 1;

  const children: BlockChild[] = [];
  for (let item = node.firstChild; item !== null; item = item.nextSibling) {
    if (item.type.isError) {
      errors.push({
        from: item.from,
        message: 'syntax error in block',
        to: item.to,
      });
      continue;
    }
    if (item.name !== 'BlockItem') continue;
    const blockChild = adaptBlockItem(item, source, newlineIndex, errors);
    if (blockChild !== null) children.push(blockChild);
  }

  const { leading: innerLeading, trailing: innerTrailing } =
    attributeContainerTrivia(
      node,
      source,
      newlineIndex,
      children,
      innerStart,
      innerEnd,
    );

  return {
    children,
    dirty: false,
    from: node.from,
    innerLeadingTrivia: innerLeading,
    innerTrailingTrivia: innerTrailing,
    kind: 'Block',
    leadingTrivia: [],
    to: node.to,
    trailingTrivia: [],
  };
}

function adaptBlockItem(
  node: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  errors: ParseError[],
): BlockChild | null {
  const inner = node.firstChild;
  if (inner === null) return null;
  if (inner.name === 'Assignment') {
    return adaptAssignment(inner, source, newlineIndex, errors);
  }
  if (inner.name === 'Value') {
    return adaptValue(inner, source, newlineIndex, errors);
  }
  return null;
}

function adaptBoolean(node: SyntaxNode, source: string): BooleanValueNode {
  const raw = source.slice(node.from, node.to);
  return {
    dirty: false,
    from: node.from,
    kind: 'BooleanValue',
    leadingTrivia: [],
    to: node.to,
    trailingTrivia: [],
    value: raw === 'yes',
  };
}

function adaptDate(node: SyntaxNode, source: string): DateValueNode {
  const raw = source.slice(node.from, node.to);
  const parts = raw.split('.');
  return {
    day: Number.parseInt(parts[2] ?? '0', 10),
    dirty: false,
    from: node.from,
    kind: 'DateValue',
    leadingTrivia: [],
    month: Number.parseInt(parts[1] ?? '0', 10),
    raw,
    to: node.to,
    trailingTrivia: [],
    year: Number.parseInt(parts[0] ?? '0', 10),
  };
}

function adaptIdentifier(node: SyntaxNode, source: string): IdentifierNode {
  return {
    dirty: false,
    from: node.from,
    kind: 'Identifier',
    leadingTrivia: [],
    name: source.slice(node.from, node.to),
    to: node.to,
    trailingTrivia: [],
  };
}

function adaptKey(
  node: SyntaxNode,
  source: string,
): IdentifierNode | StringValueNode {
  const inner = node.firstChild ?? node;
  if (inner.name === 'StringValue') {
    return adaptString(inner, source);
  }
  // A numeric key (e.g. a `naval_base` province id, `1234 = 1`) adapts to an
  // Identifier node carrying the raw digits as its name — adaptIdentifier slices
  // the source span verbatim, so the key text round-trips and `keyName` reads it
  // uniformly with letter-led keys.
  return adaptIdentifier(inner, source);
}

function adaptNumber(node: SyntaxNode, source: string): NumberValueNode {
  const raw = source.slice(node.from, node.to);
  return {
    dirty: false,
    from: node.from,
    kind: 'NumberValue',
    leadingTrivia: [],
    raw,
    to: node.to,
    trailingTrivia: [],
    value: Number(raw),
  };
}

function adaptOperator(node: SyntaxNode): OperatorNode {
  const inner = node.firstChild ?? node;
  const opKind = OPERATOR_BY_NAME[inner.name] ?? 'eq';
  return {
    dirty: false,
    from: inner.from,
    kind: 'Operator',
    leadingTrivia: [],
    opKind,
    to: inner.to,
    trailingTrivia: [],
  };
}

function adaptScriptChildren(
  root: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  errors: ParseError[],
): ScriptChild[] {
  const out: ScriptChild[] = [];
  for (let child = root.firstChild; child !== null; child = child.nextSibling) {
    if (child.type.isError) {
      errors.push({
        from: child.from,
        message: 'syntax error',
        to: child.to,
      });
      continue;
    }
    if (child.name === 'Comment') {
      continue;
    }
    if (child.name === 'Assignment') {
      out.push(adaptAssignment(child, source, newlineIndex, errors));
    }
  }
  return out;
}

function adaptString(node: SyntaxNode, source: string): StringValueNode {
  const raw = source.slice(node.from, node.to);
  return {
    dirty: false,
    from: node.from,
    kind: 'StringValue',
    leadingTrivia: [],
    raw,
    to: node.to,
    trailingTrivia: [],
    value: decodeString(raw),
  };
}

function adaptValue(
  node: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  errors: ParseError[],
): ParadoxValue {
  const inner = node.firstChild ?? node;
  switch (inner.name) {
    case 'Block':
      return adaptBlock(inner, source, newlineIndex, errors);
    case 'BooleanValue':
      return adaptBoolean(inner, source);
    case 'BracketExpression':
      return adaptIdentifier(inner, source);
    case 'DateValue':
      return adaptDate(inner, source);
    case 'Identifier':
      return adaptIdentifier(inner, source);
    case 'NumberValue':
      return adaptNumber(inner, source);
    case 'StringValue':
      return adaptString(inner, source);
    default:
      return adaptIdentifier(inner, source);
  }
}

function attributeContainerTrivia(
  container: SyntaxNode,
  source: string,
  newlineIndex: readonly number[],
  children: AttributionTarget[],
  containerStart: number,
  containerEnd: number,
): { leading: Trivia[]; trailing: Trivia[] } {
  const commentRanges = collectCommentRanges(
    container,
    containerStart,
    containerEnd,
  );

  const childRanges = children.map((c) => ({ from: c.from, to: c.to }));
  const trivia = buildGapTrivia(
    source,
    childRanges,
    commentRanges,
    containerStart,
    containerEnd,
  );

  if (children.length === 0) {
    return splitContainerTriviaAtFirstNewline(trivia);
  }

  const containerLeading: Trivia[] = [];
  let cursor = 0;

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    const pending: Trivia[] = [];
    while (cursor < trivia.length && trivia[cursor].to <= child.from) {
      pending.push(trivia[cursor]);
      cursor += 1;
    }
    if (i === 0) {
      containerLeading.push(...pending);
    } else {
      const prev = children[i - 1];
      const prevEndLine = lineOf(newlineIndex, prev.to);
      const { rest, sameLine } = splitTriviaBySameLine(
        pending,
        newlineIndex,
        prevEndLine,
      );
      prev.trailingTrivia.push(...sameLine);
      child.leadingTrivia.push(...rest);
    }
  }

  const last = children[children.length - 1];
  const tail = trivia.slice(cursor);
  const lastEndLine = lineOf(newlineIndex, last.to);
  const { rest: tailRest, sameLine: tailSameLine } = splitTriviaBySameLine(
    tail,
    newlineIndex,
    lastEndLine,
  );
  last.trailingTrivia.push(...tailSameLine);

  return { leading: containerLeading, trailing: tailRest };
}

function buildGapTrivia(
  source: string,
  childRanges: readonly CommentRange[],
  commentRanges: readonly CommentRange[],
  start: number,
  end: number,
): Trivia[] {
  type Span = { from: number; isComment: boolean; to: number };
  const spans: Span[] = [];
  for (const r of childRanges)
    spans.push({ from: r.from, isComment: false, to: r.to });
  for (const r of commentRanges)
    spans.push({ from: r.from, isComment: true, to: r.to });
  spans.sort((a, b) => a.from - b.from);

  const out: Trivia[] = [];
  let cursor = start;
  for (const span of spans) {
    if (span.from > cursor) {
      pushWhitespace(out, source, cursor, span.from);
    }
    if (span.isComment) {
      out.push({
        from: span.from,
        kind: 'Comment',
        text: source.slice(span.from, span.to),
        to: span.to,
      });
    }
    if (span.to > cursor) cursor = span.to;
  }
  if (cursor < end) {
    pushWhitespace(out, source, cursor, end);
  }
  return out;
}

function buildNewlineIndex(source: string): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10 /* \n */) offsets.push(i);
  }
  return offsets;
}

function collectCommentRanges(
  container: SyntaxNode,
  start: number,
  end: number,
): CommentRange[] {
  const comments: CommentRange[] = [];
  for (
    let child = container.firstChild;
    child !== null;
    child = child.nextSibling
  ) {
    if (child.to <= start || child.from >= end) continue;
    if (child.name === 'Comment') {
      comments.push({ from: child.from, to: child.to });
    }
  }
  return comments;
}

function decodeString(raw: string): string {
  if (raw.length < 2) return '';
  const body = raw.slice(1, -1);
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body.charCodeAt(i);
    if (ch === 92 /* \\ */ && i + 1 < body.length) {
      const next = body[i + 1];
      switch (next) {
        case '"':
          out += '"';
          break;
        case '\\':
          out += '\\';
          break;
        case 'n':
          out += '\n';
          break;
        case 't':
          out += '\t';
          break;
        default:
          out += next;
          break;
      }
      i += 1;
      continue;
    }
    out += body[i];
  }
  return out;
}

function lineOf(newlineIndex: readonly number[], offset: number): number {
  let lo = 0;
  let hi = newlineIndex.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (newlineIndex[mid] < offset) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function placeholderIdentifier(
  host: SyntaxNode,
  source: string,
): IdentifierNode {
  return {
    dirty: false,
    from: host.from,
    kind: 'Identifier',
    leadingTrivia: [],
    name: source.slice(host.from, host.to),
    to: host.to,
    trailingTrivia: [],
  };
}

function placeholderOperator(host: SyntaxNode): OperatorNode {
  return {
    dirty: false,
    from: host.from,
    kind: 'Operator',
    leadingTrivia: [],
    opKind: 'eq',
    to: host.from,
    trailingTrivia: [],
  };
}

function pushWhitespace(
  out: Trivia[],
  source: string,
  from: number,
  to: number,
): void {
  let cursor = from;
  while (cursor < to) {
    const nextNewline = source.indexOf('\n', cursor);
    const chunkEnd =
      nextNewline === -1 || nextNewline >= to ? to : nextNewline + 1;
    out.push({
      from: cursor,
      kind: 'Whitespace',
      text: source.slice(cursor, chunkEnd),
      to: chunkEnd,
    });
    cursor = chunkEnd;
  }
}

function splitContainerTriviaAtFirstNewline(trivia: readonly Trivia[]): {
  leading: Trivia[];
  trailing: Trivia[];
} {
  const leading: Trivia[] = [];
  const trailing: Trivia[] = [];
  let crossed = false;
  for (const t of trivia) {
    if (crossed) {
      trailing.push(t);
      continue;
    }
    leading.push(t);
    if (t.kind === 'Whitespace' && t.text.includes('\n')) {
      crossed = true;
    }
  }
  return { leading, trailing };
}

function splitTriviaBySameLine(
  trivia: readonly Trivia[],
  newlineIndex: readonly number[],
  prevEndLine: number,
): { rest: Trivia[]; sameLine: Trivia[] } {
  const sameLine: Trivia[] = [];
  const rest: Trivia[] = [];
  let crossed = false;
  for (const t of trivia) {
    if (crossed) {
      rest.push(t);
      continue;
    }
    if (lineOf(newlineIndex, t.from) === prevEndLine) {
      sameLine.push(t);
      if (t.kind === 'Whitespace' && t.text.includes('\n')) {
        crossed = true;
      }
      continue;
    }
    crossed = true;
    rest.push(t);
  }
  return { rest, sameLine };
}
