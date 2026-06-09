import {
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  MAX_PAYLOAD_BYTES,
} from '@contracts';
import { promises as fs } from 'node:fs';

import { assertReadable } from './path-guard.util';

export async function readTextFile(targetPath: string): Promise<string> {
  await assertReadable(targetPath);

  let stat;
  try {
    stat = await fs.stat(targetPath);
  } catch (error: unknown) {
    const errnoCode = (error as NodeJS.ErrnoException | undefined)?.code;

    if (errnoCode === 'ENOENT') {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `File not found: ${targetPath}`,
      } satisfies IpcError;
    }

    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to stat file: ${String(error)}`,
    } satisfies IpcError;
  }

  if (!stat.isFile()) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `Path is not a file: ${targetPath}`,
    } satisfies IpcError;
  }

  if (stat.size > MAX_PAYLOAD_BYTES) {
    throw {
      code: IPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: `File exceeds ${String(MAX_PAYLOAD_BYTES)} bytes`,
    } satisfies IpcError;
  }

  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error: unknown) {
    if (isIpcError(error)) throw error;

    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to read file: ${String(error)}`,
    } satisfies IpcError;
  }
}
