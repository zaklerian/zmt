// Pure DDS decoder (ZMT-40): raw `.dds` bytes → a canonical RGBA bitmap, or a
// clean `unsupported` for anything outside the uncompressed-32-bit case. No
// Electron, no filesystem — the electron-independent half of the channel, so the
// header parse and channel-mask swizzle are exhaustively unit-testable under the
// mocked-electron vitest environment. Encoding to PNG lives in the sibling
// `encode-png-data-url.util`, which owns nativeImage.
//
// Scope (Q72): uncompressed 32-bit only. The BICE/vanilla survey found the air
// backgrounds are FourCC-0 32-bit BGRA (masks R=0x00ff0000 G=0x0000ff00
// B=0x000000ff A=0xff000000); real corpus confirms 9658 such files. Channel order
// is read from the pixel-format masks, NOT hardcoded — the same code decodes an
// RGBA-ordered file. Compressed formats (any non-zero FourCC: DXT1/3/5, DX10) and
// any header shape we cannot decode (non-RGB pixel format, bit depth ≠ 32,
// truncated data) return `unsupported` rather than throwing or guessing.

const DDS_MAGIC = 0x20534444; // 'DDS ' little-endian
const DDS_HEADER_SIZE = 124; // dwSize of DDS_HEADER
const PIXEL_DATA_OFFSET = 128; // 4-byte magic + 124-byte header
const PF_FLAG_RGB = 0x40; // DDPF_RGB — uncompressed with RGB channels
const PF_FLAG_ALPHA = 0x1; // DDPF_ALPHAPIXELS — alpha mask is meaningful
const SUPPORTED_BIT_COUNT = 32;

export interface DdsDecoded {
  readonly height: number;
  // Canonical RGBA, tightly packed, length width * height * 4. Channel order is
  // always RGBA regardless of the source's mask order — consumers never re-swizzle.
  readonly rgba: Readonly<Uint8Array>;
  readonly status: 'decoded';
  readonly width: number;
}

export type DdsDecodeResult = DdsDecoded | DdsUnsupported;

// `reason` is a main-side diagnostic for logs and tests, never surfaced to the
// renderer (the channel collapses every unsupported case to a single status).
export interface DdsUnsupported {
  readonly reason: string;
  readonly status: 'unsupported';
}

export function decodeDds(bytes: Readonly<Uint8Array>): DdsDecodeResult {
  if (bytes.length < PIXEL_DATA_OFFSET) {
    return unsupported('truncated header');
  }
  if (readU32LE(bytes, 0) !== DDS_MAGIC) {
    return unsupported('not a DDS file');
  }
  if (readU32LE(bytes, 4) !== DDS_HEADER_SIZE) {
    return unsupported('unexpected header size');
  }

  const height = readU32LE(bytes, 12);
  const width = readU32LE(bytes, 16);
  if (width === 0 || height === 0) {
    return unsupported('zero dimension');
  }

  const pfFlags = readU32LE(bytes, 80);
  const fourCC = readU32LE(bytes, 84);
  if (fourCC !== 0) {
    return unsupported(`compressed format (FourCC ${String(fourCC)})`);
  }
  if ((pfFlags & PF_FLAG_RGB) === 0) {
    return unsupported('non-RGB pixel format');
  }

  const bitCount = readU32LE(bytes, 88);
  if (bitCount !== SUPPORTED_BIT_COUNT) {
    return unsupported(`unsupported bit depth (${String(bitCount)})`);
  }

  const rMask = readU32LE(bytes, 92);
  const gMask = readU32LE(bytes, 96);
  const bMask = readU32LE(bytes, 100);
  const aMask = readU32LE(bytes, 104);
  if (rMask === 0 || gMask === 0 || bMask === 0) {
    return unsupported('missing colour mask');
  }

  const pixelCount = width * height;
  if (bytes.length - PIXEL_DATA_OFFSET < pixelCount * 4) {
    return unsupported('truncated pixel data');
  }

  const hasAlpha = (pfFlags & PF_FLAG_ALPHA) !== 0 && aMask !== 0;
  const rShift = maskShift(rMask);
  const gShift = maskShift(gMask);
  const bShift = maskShift(bMask);
  const aShift = maskShift(aMask);
  // Per-channel max (mask width) normalises any field width to 8-bit. For the
  // survey's 8-bit masks each max is 255, so the scale is identity; the arithmetic
  // is what lets a non-8-bit-per-channel mask decode without a special case.
  const rMax = rMask >>> rShift;
  const gMax = gMask >>> gShift;
  const bMax = bMask >>> bShift;
  const aMax = aMask >>> aShift;

  const rgba = new Uint8Array(pixelCount * 4);
  for (let i = 0; i < pixelCount; i += 1) {
    const pixel = readU32LE(bytes, PIXEL_DATA_OFFSET + i * 4);
    const out = i * 4;
    rgba[out] = Math.round((((pixel & rMask) >>> rShift) * 255) / rMax);
    rgba[out + 1] = Math.round((((pixel & gMask) >>> gShift) * 255) / gMax);
    rgba[out + 2] = Math.round((((pixel & bMask) >>> bShift) * 255) / bMax);
    rgba[out + 3] = hasAlpha
      ? Math.round((((pixel & aMask) >>> aShift) * 255) / aMax)
      : 255;
  }

  return { height, rgba, status: 'decoded', width };
}

// Number of trailing zero bits — the right-shift that moves a mask's field to bit
// 0. Returns 0 for an all-zero mask (guarded before use).
function maskShift(mask: number): number {
  if (mask === 0) {
    return 0;
  }
  let shift = 0;
  while ((mask & (1 << shift)) === 0) {
    shift += 1;
  }
  return shift;
}

function readU32LE(bytes: Readonly<Uint8Array>, offset: number): number {
  return (
    (bytes[offset] +
      bytes[offset + 1] * 0x100 +
      bytes[offset + 2] * 0x10000 +
      bytes[offset + 3] * 0x1000000) >>>
    0
  );
}

function unsupported(reason: string): DdsUnsupported {
  return { reason, status: 'unsupported' };
}
