import {
  CatalogModule,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  ModuleEntity,
} from '@contracts';

import { entityIndexService } from '../entity-index';
import { ipcHandle } from '../ipc';
import { listModules } from '../module';

export function registerModuleHandlers(): void {
  ipcHandle<readonly CatalogModule[]>(IPC_CHANNELS.module.catalog, async () =>
    entityIndexService.moduleCatalog(),
  );

  ipcHandle<readonly ModuleEntity[]>(
    IPC_CHANNELS.module.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listModules(filePath);
    },
  );
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `${field} must be a string`,
    } satisfies IpcError;
  }
  return value;
}
