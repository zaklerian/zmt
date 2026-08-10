import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeCompressedDds,
  makeUncompressedDds,
} from './__test-utils__/make-dds.util';

const resolveMock = vi.fn();

vi.mock('../asset-resolution', () => ({
  spriteTextureService: { resolve: (name: string) => resolveMock(name) },
}));

// The nativeImage encoder needs the Electron runtime (mocked here); the real
// pixel round-trip is proven under the electron binary. The stub is deterministic
// so cache hits/misses are observable via its call count.
const encodeMock = vi.fn(() => 'data:image/png;base64,STUB');

vi.mock('./encode-png-data-url.util', () => ({
  encodePngDataUrl: () => encodeMock(),
}));

const { assetImageService } = await import('./asset-image.service');

let dir: string;

function resolvedTo(absolutePath: string): unknown {
  return {
    asset: {
      provenance: {
        absolutePath,
        modId: null,
        permission: 'readonly',
        reason: 'sole-provider',
        relativePath: 'gfx/x.dds',
        shadowedSourceIds: [],
        sourceId: absolutePath,
      },
      requestedPath: 'gfx/x.dds',
      status: 'resolved',
    },
    sprite: null,
  };
}

async function writeDds(
  name: string,
  bytes: Readonly<Uint8Array>,
): Promise<string> {
  const file = path.join(dir, name);
  await writeFile(file, Buffer.from(bytes));
  return file;
}

describe('assetImageService', () => {
  beforeEach(async () => {
    resolveMock.mockReset();
    encodeMock.mockClear();
    assetImageService.clear();
    dir = await mkdtemp(path.join(tmpdir(), 'zmt-asset-image-'));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('composes sprite name → path → decode → PNG data URL', async () => {
    const file = await writeDds(
      'ok.dds',
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [[255, 0, 0, 255]],
        width: 1,
      }),
    );
    resolveMock.mockResolvedValue(resolvedTo(file));

    const result = await assetImageService.getImage('GFX_air_techtree_bg');

    expect(result).toEqual({
      dataUrl: 'data:image/png;base64,STUB',
      status: 'ok',
    });
  });

  it('serves a second request for the same image from cache', async () => {
    const file = await writeDds(
      'ok.dds',
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [[0, 255, 0, 255]],
        width: 1,
      }),
    );
    resolveMock.mockResolvedValue(resolvedTo(file));

    await assetImageService.getImage('GFX_x');
    await assetImageService.getImage('GFX_x');

    expect(encodeMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cache when the resolved file mtime changes', async () => {
    const file = await writeDds(
      'ok.dds',
      makeUncompressedDds({
        height: 1,
        order: 'bgra',
        pixels: [[0, 0, 255, 255]],
        width: 1,
      }),
    );
    resolveMock.mockResolvedValue(resolvedTo(file));

    await assetImageService.getImage('GFX_x');

    const now = await stat(file);
    await utimes(file, now.atime, new Date(now.mtimeMs + 2000));
    await assetImageService.getImage('GFX_x');

    expect(encodeMock).toHaveBeenCalledTimes(2);
  });

  it('returns unsupported for a compressed .dds', async () => {
    const file = await writeDds('dxt.dds', makeCompressedDds('DXT5'));
    resolveMock.mockResolvedValue(resolvedTo(file));

    const result = await assetImageService.getImage('GFX_terrain');

    expect(result).toEqual({ status: 'unsupported' });
    expect(encodeMock).not.toHaveBeenCalled();
  });

  it('returns unresolved when the sprite or texture does not resolve', async () => {
    resolveMock.mockResolvedValue({
      asset: { requestedPath: '', status: 'unresolved' },
      sprite: null,
    });

    const result = await assetImageService.getImage('GFX_missing');

    expect(result).toEqual({ status: 'unresolved' });
  });

  it('returns unresolved when the resolved file is gone from disk', async () => {
    resolveMock.mockResolvedValue(resolvedTo(path.join(dir, 'vanished.dds')));

    const result = await assetImageService.getImage('GFX_x');

    expect(result).toEqual({ status: 'unresolved' });
  });
});
