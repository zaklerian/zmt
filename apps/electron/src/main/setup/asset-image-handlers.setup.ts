import type { AssetImageResult } from '@contracts';

import { IPC_CHANNELS, IPC_ERROR_CODES, IpcError } from '@contracts';

import { assetImageService } from '../asset-image';
import { ipcHandle } from '../ipc';

export function registerAssetImageHandlers(): void {
  ipcHandle<AssetImageResult>(
    IPC_CHANNELS.asset.image,
    async (_event, rawSpriteName) => {
      if (typeof rawSpriteName !== 'string') {
        throw {
          code: IPC_ERROR_CODES.BAD_REQUEST,
          message: 'spriteName must be a string',
        } satisfies IpcError;
      }
      return assetImageService.getImage(rawSpriteName);
    },
  );
}
