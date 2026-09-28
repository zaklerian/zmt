import { IPC_ERROR_CODES, MAX_PAYLOAD_BYTES } from '@zmt/contracts';
import { promises as fs } from 'node:fs';

import { IpcFailure, isErrno } from '../ipc/ipc-failure.model';
import { type SafePath } from './safe-path.model';

export async function readTextFile(target: SafePath): Promise<string> {
  let stat;
  try {
    stat = await fs.stat(target);
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) {
      throw new IpcFailure(IPC_ERROR_CODES.notFound, `File not found: ${target}`);
    }
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to stat file: ${target}`);
  }
  if (!stat.isFile()) {
    throw new IpcFailure(IPC_ERROR_CODES.badRequest, `Path is not a file: ${target}`);
  }
  if (stat.size > MAX_PAYLOAD_BYTES) {
    throw new IpcFailure(
      IPC_ERROR_CODES.payloadTooLarge,
      `File exceeds ${String(MAX_PAYLOAD_BYTES)} bytes`,
    );
  }
  try {
    return await fs.readFile(target, 'utf8');
  } catch {
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to read file: ${target}`);
  }
}
