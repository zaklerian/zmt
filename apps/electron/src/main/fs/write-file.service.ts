import {
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  MAX_PAYLOAD_BYTES,
} from '@contracts';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { assertPathUnderRoot } from './path-guard.util';

async function assertParentDirectoryExists(targetPath: string): Promise<void> {
  const parent = path.dirname(targetPath);

  try {
    const stat = await fs.stat(parent);
    if (!stat.isDirectory()) {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `Parent directory does not exist: ${parent}`,
      } satisfies IpcError;
    }
  } catch (error: unknown) {
    if (isIpcError(error)) throw error;

    const errnoCode = (error as NodeJS.ErrnoException | undefined)?.code;
    if (errnoCode === 'ENOENT') {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `Parent directory does not exist: ${parent}`,
      } satisfies IpcError;
    }

    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to stat parent directory: ${String(error)}`,
    } satisfies IpcError;
  }
}

async function atomicWrite(
  targetPath: string,
  payload: Readonly<Uint8Array> | string,
  byteLength: number,
): Promise<void> {
  await assertPathUnderRoot(targetPath);

  if (byteLength > MAX_PAYLOAD_BYTES) {
    throw {
      code: IPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: `Payload exceeds ${String(MAX_PAYLOAD_BYTES)} bytes`,
    } satisfies IpcError;
  }

  await assertParentDirectoryExists(targetPath);

  const parent = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const suffix = randomBytes(8).toString('hex');
  const tempPath = path.join(parent, `.${base}.${suffix}.tmp`);

  try {
    await fs.writeFile(tempPath, payload);
    await fs.rename(tempPath, targetPath);
  } catch (error: unknown) {
    try {
      await fs.unlink(tempPath);
    } catch {
      /* temp file may not exist; ignore */
    }

    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to write file: ${String(error)}`,
    } satisfies IpcError;
  }
}

async function writeBinary(
  targetPath: string,
  content: Readonly<Uint8Array>,
): Promise<void> {
  await atomicWrite(targetPath, content, content.byteLength);
}

async function writeText(targetPath: string, content: string): Promise<void> {
  await atomicWrite(targetPath, content, Buffer.byteLength(content, 'utf8'));
}

export const writeFileService = {
  writeBinary,
  writeText,
} as const;
