import { IPC_CHANNELS, IPC_ERROR_CODES } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerAssetImageHandlers } from './asset-image-handlers.setup';

const getImageMock = vi.fn();

vi.mock('../asset-image', () => ({
  assetImageService: { getImage: (name: string) => getImageMock(name) },
}));

describe('registerAssetImageHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    getImageMock.mockReset();
    registerAssetImageHandlers();
  });

  it('registers a handler for the asset:image channel', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.asset.image,
      expect.any(Function),
    );
  });

  it('delegates the sprite name to the service', async () => {
    getImageMock.mockResolvedValue({
      dataUrl: 'data:image/png;base64,X',
      status: 'ok',
    });
    const handler = getCapturedHandler(IPC_CHANNELS.asset.image);

    const result = await handler(makeInvokeEvent(), 'GFX_air_techtree_bg');

    expect(getImageMock).toHaveBeenCalledWith('GFX_air_techtree_bg');
    expect(result).toEqual({
      dataUrl: 'data:image/png;base64,X',
      status: 'ok',
    });
  });

  it('rejects a non-string sprite name with BAD_REQUEST', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.asset.image);

    const error = await handler(makeInvokeEvent(), 42).catch((e: unknown) => e);

    expect(extractIpcError(error).code).toBe(IPC_ERROR_CODES.BAD_REQUEST);
    expect(getImageMock).not.toHaveBeenCalled();
  });
});
