import {
  DESCRIPTOR_KEYS,
  type DescriptorDocument,
  type DescriptorList,
  type DescriptorScalar,
  type DescriptorStatement,
  type DescriptorValue,
  EMPTY_DESCRIPTOR_VALUES,
  type ModDescriptorValues,
  type ParserWarning,
} from './mod-descriptor.model';

export interface DescriptorToken {
  readonly from: number;
  readonly kind: 'close' | 'equals' | 'open' | 'word';
  readonly text: string;
  readonly to: number;
}

interface Splice {
  readonly from: number;
  readonly text: string;
  readonly to: number;
}

const WORD_END = /[\s={}#"]/u;

const SCALAR_KEYS = [
  DESCRIPTOR_KEYS.name,
  DESCRIPTOR_KEYS.version,
  DESCRIPTOR_KEYS.supportedVersion,
  DESCRIPTOR_KEYS.picture,
  DESCRIPTOR_KEYS.path,
] as const;

type ScalarKey = (typeof SCALAR_KEYS)[number];

function unquote(text: string): string {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replaceAll('\\"', '"');
  }
  return text;
}

export function quote(text: string): string {
  return `"${text.replaceAll('"', '\\"')}"`;
}

function punctuationKind(char: string): 'close' | 'equals' | 'open' | null {
  switch (char) {
    case '=':
      return 'equals';
    case '{':
      return 'open';
    case '}':
      return 'close';
    default:
      return null;
  }
}

export function tokenize(source: string): readonly DescriptorToken[] {
  let tokens: readonly DescriptorToken[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? '';
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }
    if (char === '#') {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end;
      continue;
    }
    const kind = punctuationKind(char);
    if (kind !== null) {
      tokens = [...tokens, { from: index, kind, text: char, to: index + 1 }];
      index += 1;
      continue;
    }
    let end = index + 1;
    if (char === '"') {
      while (end < source.length && source[end] !== '"') {
        end += source[end] === '\\' ? 2 : 1;
      }
      end = Math.min(end + 1, source.length);
    } else {
      while (end < source.length && !WORD_END.test(source[end] ?? '')) {
        end += 1;
      }
    }
    tokens = [...tokens, { from: index, kind: 'word', text: source.slice(index, end), to: end }];
    index = end;
  }
  return tokens;
}

function scalarOf(token: DescriptorToken): DescriptorScalar {
  return { from: token.from, kind: 'scalar', text: unquote(token.text), to: token.to };
}

export function parseDescriptor(source: string): DescriptorDocument {
  const tokens = tokenize(source);
  let statements: readonly DescriptorStatement[] = [];
  let warnings: readonly ParserWarning[] = [];
  let index = 0;

  const warn = (token: DescriptorToken, message: string): void => {
    warnings = [...warnings, { from: token.from, message, to: token.to }];
  };

  const parseList = (open: DescriptorToken): DescriptorList => {
    let items: readonly DescriptorScalar[] = [];
    let depth = 0;
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === undefined) {
        break;
      }
      index += 1;
      if (token.kind === 'close') {
        if (depth === 0) {
          return { from: open.from, items, kind: 'list', to: token.to };
        }
        depth -= 1;
      } else if (token.kind === 'open') {
        depth += 1;
        warn(token, 'Nested block is kept verbatim but not editable');
      } else if (token.kind === 'equals') {
        warn(token, 'Unexpected assignment inside a list');
      } else if (depth === 0) {
        items = [...items, scalarOf(token)];
      }
    }
    warn(open, 'Unterminated block');
    return { from: open.from, items, kind: 'list', to: source.length };
  };

  while (index < tokens.length) {
    const key = tokens[index];
    if (key === undefined) {
      break;
    }
    index += 1;
    if (key.kind !== 'word') {
      warn(key, `Unexpected "${key.text}"`);
      continue;
    }
    const equals = tokens[index];
    if (equals?.kind !== 'equals') {
      warn(key, `Expected "=" after "${key.text}"`);
      continue;
    }
    index += 1;
    const valueToken = tokens[index];
    if (valueToken === undefined || valueToken.kind === 'close' || valueToken.kind === 'equals') {
      warn(equals, `Missing value for "${key.text}"`);
      continue;
    }
    index += 1;
    const value: DescriptorValue =
      valueToken.kind === 'open' ? parseList(valueToken) : scalarOf(valueToken);
    statements = [...statements, { from: key.from, key: unquote(key.text), to: value.to, value }];
  }

  return { source, statements, warnings };
}

function scalarText(value: DescriptorValue | undefined): string {
  return value?.kind === 'scalar' ? value.text : '';
}

function listTexts(value: DescriptorValue | undefined): readonly string[] {
  return value?.kind === 'list' ? value.items.map((item) => item.text) : [];
}

function lastStatement(document: DescriptorDocument, key: string): DescriptorStatement | undefined {
  return document.statements.findLast((statement) => statement.key === key);
}

export function descriptorValues(document: DescriptorDocument): ModDescriptorValues {
  const valueOf = (key: string): DescriptorValue | undefined => lastStatement(document, key)?.value;
  return {
    name: scalarText(valueOf(DESCRIPTOR_KEYS.name)),
    path: scalarText(valueOf(DESCRIPTOR_KEYS.path)),
    picture: scalarText(valueOf(DESCRIPTOR_KEYS.picture)),
    supportedVersion: scalarText(valueOf(DESCRIPTOR_KEYS.supportedVersion)),
    tags: listTexts(valueOf(DESCRIPTOR_KEYS.tags)),
    version: scalarText(valueOf(DESCRIPTOR_KEYS.version)),
  };
}

function scalarValueOf(values: ModDescriptorValues, key: ScalarKey): string {
  switch (key) {
    case DESCRIPTOR_KEYS.name:
      return values.name;
    case DESCRIPTOR_KEYS.path:
      return values.path;
    case DESCRIPTOR_KEYS.picture:
      return values.picture;
    case DESCRIPTOR_KEYS.supportedVersion:
      return values.supportedVersion;
    case DESCRIPTOR_KEYS.version:
      return values.version;
    default:
      return key satisfies never;
  }
}

function multilineList(items: readonly string[], indentation = '\t', closing = ''): string {
  return `{\n${items.map((item) => `${indentation}${quote(item)}\n`).join('')}${closing}}`;
}

function listIndentation(source: string, list: DescriptorList): string {
  const [first] = list.items;
  if (first === undefined) {
    return '\t';
  }
  const lineStart = source.lastIndexOf('\n', first.from - 1) + 1;
  const indentation = source.slice(lineStart, first.from);
  return /^\s*$/u.test(indentation) ? indentation : ' ';
}

function renderList(source: string, list: DescriptorList, items: readonly string[]): string {
  const [first] = list.items;
  const multiline = first === undefined || source.slice(list.from, first.from).includes('\n');
  if (!multiline) {
    return `{ ${items.map(quote).join(' ')} }`;
  }
  const closingStart = source.lastIndexOf('\n', list.to - 1) + 1;
  const closingIndentation =
    closingStart > list.from ? source.slice(closingStart, list.to - 1) : '';
  return multilineList(items, listIndentation(source, list), closingIndentation);
}

function sameList(current: readonly string[], next: readonly string[]): boolean {
  return current.length === next.length && current.every((item, index) => item === next[index]);
}

function tagsSplice(
  document: DescriptorDocument,
  tags: readonly string[],
): { readonly appended: null | string; readonly splice: null | Splice } {
  const statement = lastStatement(document, DESCRIPTOR_KEYS.tags);
  if (statement === undefined) {
    return {
      appended: tags.length > 0 ? `${DESCRIPTOR_KEYS.tags}=${multilineList(tags)}` : null,
      splice: null,
    };
  }
  const { value } = statement;
  if (value.kind === 'list' && sameList(listTexts(value), tags)) {
    return { appended: null, splice: null };
  }
  const text =
    value.kind === 'list' ? renderList(document.source, value, tags) : multilineList(tags);
  return { appended: null, splice: { from: value.from, text, to: value.to } };
}

export function serializeDescriptor(
  document: DescriptorDocument,
  values: ModDescriptorValues,
): string {
  let splices: readonly Splice[] = [];
  let appended: readonly string[] = [];
  const { source } = document;

  for (const key of SCALAR_KEYS) {
    const next = scalarValueOf(values, key);
    const statement = lastStatement(document, key);
    if (statement === undefined) {
      if (next !== '') {
        appended = [...appended, `${key}=${quote(next)}`];
      }
    } else if (scalarText(statement.value) !== next) {
      splices = [
        ...splices,
        { from: statement.value.from, text: quote(next), to: statement.value.to },
      ];
    }
  }

  const tags = tagsSplice(document, values.tags);
  if (tags.splice !== null) {
    splices = [...splices, tags.splice];
  }
  if (tags.appended !== null) {
    appended = [...appended, tags.appended];
  }

  let output = source;
  for (const splice of [...splices].sort((left, right) => right.from - left.from)) {
    output = `${output.slice(0, splice.from)}${splice.text}${output.slice(splice.to)}`;
  }
  if (appended.length > 0) {
    const separator = output === '' || output.endsWith('\n') ? '' : '\n';
    output = `${output}${separator}${appended.join('\n')}\n`;
  }
  return output;
}

export function defaultDescriptorValues(): ModDescriptorValues {
  return EMPTY_DESCRIPTOR_VALUES;
}

export function descriptorValuesEqual(a: ModDescriptorValues, b: ModDescriptorValues): boolean {
  return (
    a.name === b.name &&
    a.path === b.path &&
    a.picture === b.picture &&
    a.supportedVersion === b.supportedVersion &&
    a.version === b.version &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
  );
}
