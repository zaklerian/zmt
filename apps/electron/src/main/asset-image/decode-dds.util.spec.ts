import { describe, expect, it } from 'vitest';

import {
  makeCompressedDds,
  makeUncompressedDds,
} from './__test-utils__/make-dds.util';
import { decodeDds } from './decode-dds.util';

const RED = [255, 0, 0, 255] as const;
const GREEN = [0, 255, 0, 255] as const;
const BLUE = [0, 0, 255, 255] as const;
const TRANSLUCENT = [255, 255, 255, 128] as const;

describe('decodeDds', () => {
  it('reads width and height from the header', () => {
    const result = decodeDds(
      makeUncompressedDds({
        height: 2,
        order: 'bgra',
        pixels: [RED, GREEN, BLUE, RED, GREEN, BLUE],
        width: 3,
      }),
    );

    expect(result.status).toBe('decoded');
    if (result.status !== 'decoded') return;
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.rgba).toHaveLength(3 * 2 * 4);
  });

  it('swizzles a BGRA-mask file to canonical RGBA with no red/blue swap', () => {
    const result = decodeDds(
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [RED, GREEN, BLUE, TRANSLUCENT],
        width: 4,
      }),
    );

    expect(result.status).toBe('decoded');
    if (result.status !== 'decoded') return;
    expect([...result.rgba]).toEqual([
      ...RED,
      ...GREEN,
      ...BLUE,
      ...TRANSLUCENT,
    ]);
  });

  it('decodes an RGBA-mask file to the same canonical RGBA (order read from masks, not hardcoded)', () => {
    const pixels = [RED, GREEN, BLUE, TRANSLUCENT] as const;
    const fromBgra = decodeDds(
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [...pixels],
        width: 4,
      }),
    );
    const fromRgba = decodeDds(
      makeUncompressedDds({
        height: 1,
        order: 'rgba',
        pixels: [...pixels],
        width: 4,
      }),
    );

    expect(fromBgra.status).toBe('decoded');
    expect(fromRgba.status).toBe('decoded');
    if (fromBgra.status !== 'decoded' || fromRgba.status !== 'decoded') return;
    expect([...fromRgba.rgba]).toEqual([...fromBgra.rgba]);
  });

  it('forces alpha to 255 when the header has no alpha channel', () => {
    const result = decodeDds(
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [[10, 20, 30, 40]],
        width: 1,
        withAlpha: false,
      }),
    );

    expect(result.status).toBe('decoded');
    if (result.status !== 'decoded') return;
    expect([...result.rgba]).toEqual([10, 20, 30, 255]);
  });

  it('returns unsupported for a compressed (non-zero FourCC) file', () => {
    expect(decodeDds(makeCompressedDds('DXT5')).status).toBe('unsupported');
    expect(decodeDds(makeCompressedDds('DXT1')).status).toBe('unsupported');
  });

  it('returns unsupported for an unexpected bit depth', () => {
    const dds = makeUncompressedDds({
      height: 1,
      order: 'bgra',
      pixels: [RED],
      width: 1,
    });
    dds[88] = 24; // bit count 24 instead of 32

    expect(decodeDds(dds).status).toBe('unsupported');
  });

  it('returns unsupported for a truncated header', () => {
    expect(decodeDds(new Uint8Array(64)).status).toBe('unsupported');
  });

  it('returns unsupported for a non-DDS magic', () => {
    const bytes = makeUncompressedDds({
      height: 1,
      order: 'bgra',
      pixels: [RED],
      width: 1,
    });
    bytes[0] = 0;

    expect(decodeDds(bytes).status).toBe('unsupported');
  });

  it('returns unsupported when the pixel data is truncated', () => {
    const full = makeUncompressedDds({
      height: 4,
      order: 'bgra',
      pixels: Array.from({ length: 16 }, () => RED),
      width: 4,
    });
    // Keep the 128-byte header but drop most of the pixel data.
    expect(decodeDds(full.slice(0, 128 + 8)).status).toBe('unsupported');
  });
});
