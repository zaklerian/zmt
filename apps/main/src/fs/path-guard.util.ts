import { IPC_ERROR_CODES } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { IpcFailure, isErrno } from '../ipc/ipc-failure.model';
import { type SafePath } from './safe-path.model';

export type PathPlatform = 'posix' | 'win32';

export interface PathGuardOptions {
  readonly platform?: PathPlatform;
}

function pathApi(platform: PathPlatform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path.posix;
}

export function normalizeForComparison(target: string, platform: PathPlatform): string {
  const normalized = pathApi(platform).normalize(target).normalize('NFC');
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function isContained(target: string, root: string, platform: PathPlatform): boolean {
  const api = pathApi(platform);
  const normalizedRoot = normalizeForComparison(root, platform).replace(
    new RegExp(`\\${api.sep}+$`, 'u'),
    '',
  );
  const normalizedTarget = normalizeForComparison(target, platform);
  return (
    normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + api.sep)
  );
}

function forbidden(target: string): IpcFailure {
  return new IpcFailure(IPC_ERROR_CODES.forbidden, `Path is outside the allowed root: ${target}`);
}

async function realpathOrNull(target: string): Promise<null | string> {
  try {
    return await fs.realpath(target);
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) {
      return null;
    }
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to resolve path: ${target}`);
  }
}

export async function resolveRealPath(absolute: string): Promise<string> {
  const direct = await realpathOrNull(absolute);
  if (direct !== null) {
    return direct;
  }
  let tail: readonly string[] = [];
  let current = absolute;
  while (path.dirname(current) !== current) {
    const parent = path.dirname(current);
    tail = [path.basename(current), ...tail];
    const realParent = await realpathOrNull(parent);
    if (realParent !== null) {
      return path.join(realParent, ...tail);
    }
    current = parent;
  }
  throw forbidden(absolute);
}

export async function resolveRoot(root: string): Promise<string> {
  const resolved = await realpathOrNull(path.resolve(root));
  if (resolved === null) {
    throw new IpcFailure(IPC_ERROR_CODES.forbidden, 'The allowed root folder does not exist');
  }
  return resolved;
}

export async function toSafePath(
  root: string,
  target: string,
  options: PathGuardOptions = {},
): Promise<SafePath> {
  const platform = options.platform ?? (process.platform === 'win32' ? 'win32' : 'posix');
  if (target.includes('\0')) {
    throw new IpcFailure(IPC_ERROR_CODES.badRequest, 'Path contains a NUL byte');
  }
  const resolvedRoot = await resolveRoot(root);
  const resolvedTarget = await resolveRealPath(path.resolve(target));
  if (!isContained(resolvedTarget, resolvedRoot, platform)) {
    throw forbidden(target);
  }
  return resolvedTarget as SafePath;
}
