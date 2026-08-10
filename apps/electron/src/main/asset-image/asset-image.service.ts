import type { AssetImageResult } from '@contracts';

import { promises as fs } from 'node:fs';

import { spriteTextureService } from '../asset-resolution';
import { decodeDds } from './decode-dds.util';
import { encodePngDataUrl } from './encode-png-data-url.util';

// The `asset:image` channel service (ZMT-40): composes the whole chain —
// `spriteName → spriteTextureService (name→path, ZMT-39) → decodeDds (path→pixels)
// → nativeImage PNG data URL`. The single architectural line: main decodes, the
// renderer receives a PNG data URL keyed by sprite name.
//
// Cache: decode+encode isn't free (backgrounds are large), so the encoded data URL
// is cached per resolved absolute path, invalidated on mtime change — the same
// resolved-path + mtime validity discipline the tech-tree geometry and entity
// index caches use (ADR 024/025). Only `ok` results are cached; an `unsupported`
// bails at the header (cheap) and an `unresolved` never reads a file.

interface CacheEntry {
  readonly dataUrl: string;
  readonly mtimeMs: number;
}

const cache = new Map<string, CacheEntry>();

// Clears the decoded-image cache. Used on a source-set change and between tests;
// an mtime change is also caught structurally, but this is the explicit hook.
function clear(): void {
  cache.clear();
}

async function getImage(spriteName: string): Promise<AssetImageResult> {
  const { asset } = await spriteTextureService.resolve(spriteName);
  if (asset.status !== 'resolved') {
    return { status: 'unresolved' };
  }

  const { absolutePath } = asset.provenance;

  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(absolutePath)).mtimeMs;
  } catch {
    // Resolved a path that vanished between resolve and read — a clean unresolved,
    // consistent with resolution B's two-outcome contract.
    return { status: 'unresolved' };
  }

  const cached = cache.get(absolutePath);
  if (cached !== undefined && cached.mtimeMs === mtimeMs) {
    return { dataUrl: cached.dataUrl, status: 'ok' };
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(absolutePath);
  } catch {
    return { status: 'unresolved' };
  }

  const decoded = decodeDds(bytes);
  if (decoded.status !== 'decoded') {
    return { status: 'unsupported' };
  }

  const dataUrl = encodePngDataUrl(decoded);
  cache.set(absolutePath, { dataUrl, mtimeMs });
  return { dataUrl, status: 'ok' };
}

export const assetImageService = {
  clear,
  getImage,
} as const;
