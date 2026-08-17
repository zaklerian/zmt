import {
  IPC_ERROR_CODES,
  IpcError,
  LocDeleteDelta,
  LocDelta,
  LocInsertDelta,
  LocSetDelta,
} from '@contracts';

// The loc-lines strategy (ADR 027 decision 2): the localisation (`.yml`) format
// strategy of the write boundary, alongside the Clausewitz-family AST strategy.
// It is PURE — `(source, delta) → patched bytes`, no fs and no store — so the
// write logic is verifiable in-session without an Electron binary (decision 6).
//
// loc is NOT YAML (a `KEY:0 "value"` colon-without-space is invalid YAML mapping
// syntax; `yaml.safe_load` raises). It is line-oriented and LOSSLESS: a read
// followed by an unmodified write is byte-identical — BOM, header, key order,
// version suffixes, comments, blank lines, quoting, and escapes all survive.
//
// The model (ZMT-48 grounding, `docs/grounding/ZMT-48-loc-format-grounding.md`):
// a file is an ordered list of physical LINES, each carrying its own EOL, with
// the UTF-8 BOM held as a document flag. A line that cleanly parses as a single
// leading `KEY:VERSION "value"` is an indexable key entry (indent / key /
// version / inner-value byte-span); every other line — header, comment, blank,
// trailing-whitespace, multi-key, malformed — is preserved VERBATIM. Round-trip
// is exact by construction: `BOM + Σ(raw + eol)`. A delta touches only the
// affected key's line(s):
//   - set    — rewrite an existing key's inner value; indent, key, version,
//              quotes, and any trailing comment on that line are untouched.
//   - insert — append a new key line in the file's own indent and EOL style
//              (append is the accepted PoC position; the user-chosen save-target
//              file is a later `resolveWriteTarget` concern, not this strategy's).
//   - delete — remove an existing key's whole line.
//
// A physical line carrying more than one key is indexed by its FIRST key only
// (documented PoC limit); the air technologies the canvas edits are all clean
// single-key lines. `value` on set/insert is written verbatim between the quotes
// — the caller owns any `\"` / `\n` / `§` escaping, mirroring the AST strategy's
// verbatim `EntityField.value`.

// The delta vocabulary (`LocDelta` and its three variants) now lives in
// @contracts: the TL edit form composes loc deltas renderer-side and ships them
// over `entity:writeBatch`, so the shape crosses the wire (R-ELECTRON-2, ZMT-50).
// This strategy consumes it; it does not declare it.

const BOM = '﻿';

// The reader's output (ADR 027 decision 2): a loc file as ordered entries — the
// UTF-8 BOM as a document flag, then physical lines in order. A key line exposes
// its key / version / value; every other line is a verbatim non-key line (header,
// comment, blank). `serializeLoc` (the writer) is its exact inverse.
export interface LocDocument {
  readonly hasBom: boolean;
  readonly lines: readonly LocLine[];
}

export interface LocLine {
  readonly eol: string;
  // Non-null only for a clean single-key line; the byte-span [valueFrom, valueTo)
  // within `raw` is the inner value (exclusive of the surrounding quotes).
  readonly key: null | string;
  readonly raw: string;
  readonly valueFrom: number;
  readonly valueTo: number;
  // The numeric version suffix as text ('' when versionless), null for a non-key
  // line. Recoverable from `raw`; surfaced so an entry reads as key/version/value.
  readonly version: null | string;
}

// Applies a single loc delta to `source`, returning the patched bytes. Pure: no
// fs, no store. Byte-lossless outside the one line the delta names.
export function applyLocDelta(source: string, delta: LocDelta): string {
  const doc = parseLoc(source);
  switch (delta.kind) {
    case 'delete':
      return serializeLoc(applyDelete(doc, delta));
    case 'insert':
      return serializeLoc(applyInsert(doc, delta));
    case 'set':
      return serializeLoc(applySet(doc, delta));
  }
}

// The reader. Splits `source` into ordered physical lines, each retaining its own
// EOL, with a leading UTF-8 BOM captured as a document flag. Lossless: the writer
// `serializeLoc` is its exact inverse. A trailing terminator is the last line's
// `eol`, not a phantom empty line, so join reproduces the input byte-for-byte.
export function parseLoc(source: string): LocDocument {
  const hasBom = source.startsWith(BOM);
  const body = hasBom ? source.slice(BOM.length) : source;
  const lines: LocLine[] = [];
  let i = 0;
  while (i < body.length) {
    const nl = body.indexOf('\n', i);
    if (nl === -1) {
      lines.push(toLine(body.slice(i), ''));
      break;
    }
    const crlf = nl > i && body[nl - 1] === '\r';
    const raw = body.slice(i, crlf ? nl - 1 : nl);
    lines.push(toLine(raw, crlf ? '\r\n' : '\n'));
    i = nl + 1;
  }
  return { hasBom, lines };
}

// The writer. Reassembles the ordered entries into bytes; exact inverse of the
// reader `parseLoc`.
export function serializeLoc(doc: LocDocument): string {
  const body = doc.lines.map((line) => line.raw + line.eol).join('');
  return doc.hasBom ? BOM + body : body;
}

// The strategy's serialize-back check (ADR 027 decision 3, phase 1): parsing the
// produced bytes and re-serializing must reproduce them exactly. A patched buffer
// that fails to round-trip would corrupt the file's byte shape; this catches it
// before anything is renamed. Throws `INTERNAL` on a round-trip mismatch.
export function validateLocBytes(bytes: string): void {
  if (serializeLoc(parseLoc(bytes)) !== bytes) {
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: 'Serialized loc output failed to round-trip',
    } satisfies IpcError;
  }
}

function applyDelete(doc: LocDocument, delta: LocDeleteDelta): LocDocument {
  const index = doc.lines.findIndex((line) => line.key === delta.key);
  if (index === -1) throw notFound(delta.key);
  return {
    hasBom: doc.hasBom,
    lines: doc.lines.filter((_, i) => i !== index),
  };
}

function applyInsert(doc: LocDocument, delta: LocInsertDelta): LocDocument {
  if (doc.lines.some((line) => line.key === delta.key)) {
    throw conflict(delta.key);
  }
  const eol = dominantEol(doc.lines);
  const indent = keyIndent(doc.lines);
  const versionSegment = delta.version.length > 0 ? `:${delta.version}` : ':';
  const raw = `${indent}${delta.key}${versionSegment} "${delta.value}"`;
  const inserted: LocLine = {
    eol,
    key: delta.key,
    raw,
    valueFrom: raw.length - delta.value.length - 1,
    valueTo: raw.length - 1,
    version: delta.version,
  };

  // Give the trailing line an EOL so the appended line begins on its own row; a
  // BICE loc file ends with a terminator, but a file that did not would otherwise
  // glue the two lines together.
  const lines = [...doc.lines];
  const last = lines.at(-1);
  if (last !== undefined && last.eol === '') {
    lines[lines.length - 1] = { ...last, eol };
  }
  lines.push(inserted);
  return { hasBom: doc.hasBom, lines };
}

function applySet(doc: LocDocument, delta: LocSetDelta): LocDocument {
  const index = doc.lines.findIndex((line) => line.key === delta.key);
  if (index === -1) throw notFound(delta.key);
  const line = doc.lines[index];
  const raw =
    line.raw.slice(0, line.valueFrom) +
    delta.value +
    line.raw.slice(line.valueTo);
  const lines = [...doc.lines];
  lines[index] = {
    ...line,
    raw,
    valueTo: line.valueFrom + delta.value.length,
  };
  return { hasBom: doc.hasBom, lines };
}

function conflict(key: string): IpcError {
  return {
    code: IPC_ERROR_CODES.CONFLICT,
    message: `Loc key already exists: ${key}`,
  };
}

// The EOL to use for an appended line: the terminator of the first line that has
// one (the header always does in a real file), so a CRLF file gets CRLF appends.
function dominantEol(lines: readonly LocLine[]): string {
  return lines.find((line) => line.eol !== '')?.eol ?? '\n';
}

// The indent to use for an appended line: the leading whitespace of the first
// key line (BICE uses a single leading space), else a single space.
function keyIndent(lines: readonly LocLine[]): string {
  const keyLine = lines.find((line) => line.key !== null);
  if (keyLine === undefined) return ' ';
  return /^[ \t]*/.exec(keyLine.raw)?.[0] ?? ' ';
}

function notFound(key: string): IpcError {
  return {
    code: IPC_ERROR_CODES.NOT_FOUND,
    message: `Loc key not found: ${key}`,
  };
}

// Parses one physical line for a single leading `KEY:VERSION "value"`. Returns the
// key, its version suffix, and the inner-value byte-span, or null when the line is
// not a clean key line (header, comment, blank, multi-key tail, or malformed) —
// such lines are preserved verbatim and are not indexable.
function parseKeyLine(raw: string): {
  readonly key: string;
  readonly valueFrom: number;
  readonly valueTo: number;
  readonly version: string;
} | null {
  let i = 0;
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i += 1;
  // A `#` at the first non-space column is a comment, not a key.
  if (i >= raw.length || raw[i] === '#') return null;

  const keyStart = i;
  while (
    i < raw.length &&
    raw[i] !== ':' &&
    raw[i] !== ' ' &&
    raw[i] !== '\t'
  ) {
    i += 1;
  }
  if (raw[i] !== ':' || i === keyStart) return null;
  const key = raw.slice(keyStart, i);
  i += 1;

  const versionStart = i;
  while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') i += 1;
  const version = raw.slice(versionStart, i);
  // Exactly one space separates `KEY:VERSION` from the opening quote.
  if (raw[i] !== ' ') return null;
  i += 1;
  if (raw[i] !== '"') return null;

  const valueFrom = i + 1;
  let j = valueFrom;
  while (j < raw.length) {
    // A backslash escapes the next char (`\"`, `\n`); the close is the first
    // UNescaped quote. Everything past it (trailing comment, spaces, a second
    // key) stays in `raw` and is preserved verbatim.
    if (raw[j] === '\\') {
      j += 2;
      continue;
    }
    if (raw[j] === '"') return { key, valueFrom, valueTo: j, version };
    j += 1;
  }
  return null;
}

function toLine(raw: string, eol: string): LocLine {
  const parsed = parseKeyLine(raw);
  if (parsed === null) {
    return { eol, key: null, raw, valueFrom: -1, valueTo: -1, version: null };
  }
  return {
    eol,
    key: parsed.key,
    raw,
    valueFrom: parsed.valueFrom,
    valueTo: parsed.valueTo,
    version: parsed.version,
  };
}
