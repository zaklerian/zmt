import {
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  TechnologyDeletePlanResult,
  TechnologyEntity,
} from '@contracts';

import { ipcHandle } from '../ipc';
import { buildTechnologyDeletePlan, listTechnologies } from '../technology';

export function registerTechnologyHandlers(): void {
  ipcHandle<readonly TechnologyEntity[]>(
    IPC_CHANNELS.technology.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listTechnologies(filePath);
    },
  );

  ipcHandle<TechnologyDeletePlanResult>(
    IPC_CHANNELS.technology.deletePlan,
    async (_event, rawId) =>
      buildTechnologyDeletePlan(requireString(rawId, 'id')),
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
