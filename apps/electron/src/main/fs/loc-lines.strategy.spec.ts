import { IPC_ERROR_CODES } from '@contracts';
import { describe, expect, it } from 'vitest';

import {
  applyLocDelta,
  parseLoc,
  serializeLoc,
  validateLocBytes,
} from './loc-lines.strategy';

// ADR 027 decision 2 / regression gate 5. The loc-lines strategy is the lossless
// localisation (`.yml`) format strategy. These specs drive it against a
// real-SHAPE BICE loc fixture — UTF-8 BOM, `l_english:` header, a `#` comment, an
// empty and a space-only blank line, versioned (`:0`/`:1`/`:4`) and versionless
// (`SELECT_ROCKET:`) keys, `§` colour codes, a `$VAR|fmt$` variable, an escaped
// `\"`, and a multi-key physical line. Byte shape grounded in
// `docs/grounding/ZMT-48-loc-format-grounding.md`. The strategy is pure, so no fs
// and no Electron binary.

const BOM = '﻿';
const l = (...lines: readonly string[]): string => lines.join('\n');

// A real-shape BOM'd loc file. `\\"` is a literal backslash-quote in the bytes.
const REAL_LOC =
  BOM +
  l(
    'l_english:',
    ' # air technologies',
    ' STRAT_BOMBER_NAME:0 "Strategic Bomber"',
    ' EARLY_FIGHTER_NAME:1 "§REarly Fighter§!"',
    '',
    ' ',
    ' SELECT_ROCKET: "Select a rocket"',
    ' AIR_XP_COST:4 "Cost: $AMOUNT|H1%$ \\"est.\\""',
    ' PAIR_A:0 "a" PAIR_B:0 "b"',
    '',
  );

// The same shape with CRLF terminators (BICE's `equipment_l_english.yml` is CRLF).
const CRLF_LOC =
  BOM +
  ['l_english:', ' FIRST_KEY:0 "first"', ' SECOND_KEY:2 "second"', ''].join(
    '\r\n',
  );

describe('loc-lines strategy — lossless round-trip (ADR 027 gate 5)', () => {
  it("reads and writes a real BOM'd file back byte-identically", () => {
    expect(serializeLoc(parseLoc(REAL_LOC))).toBe(REAL_LOC);
  });

  it('round-trips a CRLF file byte-identically (per-file EOL preserved)', () => {
    expect(serializeLoc(parseLoc(CRLF_LOC))).toBe(CRLF_LOC);
  });

  it('exposes ordered entries — key/version for key lines, verbatim otherwise', () => {
    const { hasBom, lines } = parseLoc(REAL_LOC);
    expect(hasBom).toBe(true);
    // Header, comment, and both blank lines are verbatim non-key entries.
    expect(lines.slice(0, 2).map((line) => line.key)).toEqual([null, null]);
    const strat = lines.find((line) => line.key === 'STRAT_BOMBER_NAME');
    const rocket = lines.find((line) => line.key === 'SELECT_ROCKET');
    expect(strat?.version).toBe('0');
    expect(rocket?.version).toBe('');
  });

  it('validateLocBytes accepts a losslessly round-tripping buffer', () => {
    expect(() => validateLocBytes(REAL_LOC)).not.toThrow();
  });
});

describe('loc-lines strategy — set (touches only the key line)', () => {
  it('rewrites an existing key value, every other byte identical', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'STRAT_BOMBER_NAME',
      kind: 'set',
      value: 'Heavy Bomber',
    });
    expect(result).toBe(
      REAL_LOC.replace('"Strategic Bomber"', '"Heavy Bomber"'),
    );
  });

  it('sets a versionless key without inventing a version suffix', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'SELECT_ROCKET',
      kind: 'set',
      value: 'Pick a rocket',
    });
    expect(result).toBe(
      REAL_LOC.replace('"Select a rocket"', '"Pick a rocket"'),
    );
  });

  it('preserves a trailing embedded-escape value shape on set', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'AIR_XP_COST',
      kind: 'set',
      value: 'Cost: §G$AMOUNT|H1%$§!',
    });
    expect(result).toBe(
      REAL_LOC.replace(
        '"Cost: $AMOUNT|H1%$ \\"est.\\""',
        '"Cost: §G$AMOUNT|H1%$§!"',
      ),
    );
  });

  it('throws NOT_FOUND for a missing key', () => {
    expect(() =>
      applyLocDelta(REAL_LOC, { key: 'NO_SUCH_KEY', kind: 'set', value: 'x' }),
    ).toThrow(expect.objectContaining({ code: IPC_ERROR_CODES.NOT_FOUND }));
  });

  it('indexes a multi-key line by its FIRST key only (documented PoC limit)', () => {
    // PAIR_A is addressable and rewrites only its own value, leaving PAIR_B's
    // bytes on the same physical line untouched.
    const result = applyLocDelta(REAL_LOC, {
      key: 'PAIR_A',
      kind: 'set',
      value: 'z',
    });
    expect(result).toBe(REAL_LOC.replace('PAIR_A:0 "a"', 'PAIR_A:0 "z"'));
    // PAIR_B, sharing the line, is not independently addressable.
    expect(() =>
      applyLocDelta(REAL_LOC, { key: 'PAIR_B', kind: 'set', value: 'z' }),
    ).toThrow(expect.objectContaining({ code: IPC_ERROR_CODES.NOT_FOUND }));
  });
});

describe("loc-lines strategy — insert (append in the file's own style)", () => {
  it('appends a new versioned key line, every prior byte identical', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'NEW_TECH_NAME',
      kind: 'insert',
      value: 'New Tech',
      version: '0',
    });
    expect(result).toBe(`${REAL_LOC} NEW_TECH_NAME:0 "New Tech"\n`);
  });

  it('appends a versionless key line when version is empty', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'NEW_LABEL',
      kind: 'insert',
      value: 'Label',
      version: '',
    });
    expect(result).toBe(`${REAL_LOC} NEW_LABEL: "Label"\n`);
  });

  it("appends using the file's CRLF terminator", () => {
    const result = applyLocDelta(CRLF_LOC, {
      key: 'THIRD_KEY',
      kind: 'insert',
      value: 'third',
      version: '0',
    });
    expect(result).toBe(`${CRLF_LOC} THIRD_KEY:0 "third"\r\n`);
  });

  it('throws CONFLICT when the key already exists', () => {
    expect(() =>
      applyLocDelta(REAL_LOC, {
        key: 'STRAT_BOMBER_NAME',
        kind: 'insert',
        value: 'x',
        version: '0',
      }),
    ).toThrow(expect.objectContaining({ code: IPC_ERROR_CODES.CONFLICT }));
  });
});

describe('loc-lines strategy — delete (removes only the key line)', () => {
  it('removes an existing key line, every other byte identical', () => {
    const result = applyLocDelta(REAL_LOC, {
      key: 'EARLY_FIGHTER_NAME',
      kind: 'delete',
    });
    expect(result).toBe(
      REAL_LOC.replace(' EARLY_FIGHTER_NAME:1 "§REarly Fighter§!"\n', ''),
    );
  });

  it('throws NOT_FOUND for a missing key', () => {
    expect(() =>
      applyLocDelta(REAL_LOC, { key: 'NO_SUCH_KEY', kind: 'delete' }),
    ).toThrow(expect.objectContaining({ code: IPC_ERROR_CODES.NOT_FOUND }));
  });
});
