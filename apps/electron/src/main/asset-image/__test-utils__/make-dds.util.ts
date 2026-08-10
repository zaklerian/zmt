// Synthesises DDS byte buffers for decode/service specs — no binary fixtures
// checked in; the header shape is spelled out here where the tests can read it.
// Mirrors the real BICE/vanilla headers the ZMT-40 survey found: FourCC-0, 32-bit,
// with the pixel-format masks that fix channel order (BGRA on disk for the air
// backgrounds). `order` flips the masks + byte layout so a spec can prove the
// decoder reads order from the masks, not from a hardcoded assumption.

const MAGIC = 0x20534444;
const HEADER_SIZE = 124;
const PF_RGB = 0x40;
const PF_ALPHA = 0x1;

type Rgba = readonly [number, number, number, number];

const MASKS = {
  bgra: { a: 0xff000000, b: 0x000000ff, g: 0x0000ff00, r: 0x00ff0000 },
  rgba: { a: 0xff000000, b: 0x00ff0000, g: 0x0000ff00, r: 0x000000ff },
} as const;

export function makeCompressedDds(fourCC = 'DXT5'): Uint8Array {
  const buf = baseHeader(4, 4);
  buf.writeUInt32LE(0, 80); // pixel-format flags: DDPF_FOURCC would be set here
  buf.write(fourCC, 84, 'ascii');
  return new Uint8Array(buf);
}

export function makeUncompressedDds(opts: {
  readonly height: number;
  readonly order: 'bgra' | 'rgba';
  readonly pixels: readonly Rgba[];
  readonly width: number;
  readonly withAlpha?: boolean;
}): Uint8Array {
  const { height, order, pixels, width } = opts;
  const withAlpha = opts.withAlpha ?? true;
  const masks = MASKS[order];

  const buf = Buffer.concat([
    baseHeader(width, height),
    Buffer.alloc(width * height * 4),
  ]);
  buf.writeUInt32LE(PF_RGB | (withAlpha ? PF_ALPHA : 0), 80);
  buf.writeUInt32LE(0, 84); // FourCC 0 — uncompressed
  buf.writeUInt32LE(32, 88); // bit count
  buf.writeUInt32LE(masks.r, 92);
  buf.writeUInt32LE(masks.g, 96);
  buf.writeUInt32LE(masks.b, 100);
  buf.writeUInt32LE(withAlpha ? masks.a : 0, 104);

  pixels.forEach(([r, g, b, a], i) => {
    const off = 128 + i * 4;
    // 32-bit little-endian value laid out so the mask fields select r/g/b/a.
    const value =
      order === 'bgra'
        ? ((withAlpha ? a : 255) << 24) | (r << 16) | (g << 8) | b
        : ((withAlpha ? a : 255) << 24) | (b << 16) | (g << 8) | r;
    buf.writeUInt32LE(value >>> 0, off);
  });

  return new Uint8Array(buf);
}

// Magic + DDS_HEADER up to (but not including) the pixel-format flags at 80.
function baseHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(128);
  buf.writeUInt32LE(MAGIC, 0);
  buf.writeUInt32LE(HEADER_SIZE, 4);
  buf.writeUInt32LE(0x1 | 0x2 | 0x4 | 0x1000, 8); // caps|height|width|pixelformat
  buf.writeUInt32LE(height, 12);
  buf.writeUInt32LE(width, 16);
  buf.writeUInt32LE(width * 4, 20); // pitch
  buf.writeUInt32LE(32, 76); // pfSize
  return buf;
}
