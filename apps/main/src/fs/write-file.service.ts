import { IPC_ERROR_CODES, MAX_PAYLOAD_BYTES } from '@zmt/contracts';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { IpcFailure, isErrno } from '../ipc/ipc-failure.model';
import { type SafePath } from './safe-path.model';

export async function assertParentDirectory(target: SafePath): Promise<void> {
  const parent = path.dirname(target);
  let stat;
  try {
    stat = await fs.stat(parent);
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) {
      throw new IpcFailure(IPC_ERROR_CODES.notFound, `Parent directory does not exist: ${parent}`);
    }
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to stat parent directory: ${parent}`);
  }
  if (!stat.isDirectory()) {
    throw new IpcFailure(IPC_ERROR_CODES.notFound, `Parent directory does not exist: ${parent}`);
  }
}

export async function assertNotDirectory(target: SafePath): Promise<void> {
  try {
    const stat = await fs.lstat(target);
    if (stat.isDirectory()) {
      throw new IpcFailure(IPC_ERROR_CODES.badRequest, `Path is a directory: ${target}`);
    }
  } catch (error: unknown) {
    if (error instanceof IpcFailure) {
      throw error;
    }
    if (!isErrno(error, 'ENOENT')) {
      throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to stat file: ${target}`);
    }
  }
}

export function tempPathFor(target: string): string {
  const suffix = randomBytes(8).toString('hex');
  return path.join(path.dirname(target), `.${path.basename(target)}.${suffix}.tmp`);
}

async function atomicWrite(target: SafePath, payload: string, byteLength: number): Promise<void> {
  if (byteLength > MAX_PAYLOAD_BYTES) {
    throw new IpcFailure(
      IPC_ERROR_CODES.payloadTooLarge,
      `Payload exceeds ${String(MAX_PAYLOAD_BYTES)} bytes`,
    );
  }
  await assertParentDirectory(target);
  await assertNotDirectory(target);
  const tempPath = tempPathFor(target);
  try {
    await fs.writeFile(tempPath, payload);
    await fs.rename(tempPath, target);
  } catch {
    await fs.rm(tempPath, { force: true });
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to write file: ${target}`);
  }
}

export async function writeTextFile(target: SafePath, content: string): Promise<void> {
  await atomicWrite(target, content, Buffer.byteLength(content, 'utf8'));
}
