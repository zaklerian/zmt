import {
  EntityDeleteRequest,
  EntityWriteRequest,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';
import {
  type AssignmentNode,
  type BlockChild,
  type BlockNode,
  dialectsFromPlugins,
  parse,
} from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { pluginRegistryService } from '../plugins';
import { workspaceStoreService } from '../workspace';
import { assertWritable } from './path-guard.util';
import { writeFileService } from './write-file.service';

interface LocatedEntity {
  readonly absolutePath: string;
  readonly block: BlockNode;
  readonly node: AssignmentNode;
  readonly source: string;
}

interface SourceEdit {
  readonly from: number;
  readonly text: string;
  readonly to: number;
}

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.from - a.from);
  let out = source;
  for (const edit of ordered) {
    out = out.slice(0, edit.from) + edit.text + out.slice(edit.to);
  }
  return out;
}

function conflict(key: string): IpcError {
  return {
    code: IPC_ERROR_CODES.CONFLICT,
    message: `Stale field: ${key}`,
  };
}

async function deleteEntity(request: EntityDeleteRequest): Promise<void> {
  const { absolutePath, node, source } = await loadAndLocate(
    request.modId,
    request.relativePath,
    request.entityName,
  );

  const from = lineStartOf(source, node.from);
  const newline = source.indexOf('\n', node.to);
  const to = newline === -1 ? source.length : newline + 1;
  const patched = source.slice(0, from) + source.slice(to);

  await writeFileService.writeText(absolutePath, patched);
}

function lineStartOf(source: string, offset: number): number {
  return source.lastIndexOf('\n', offset - 1) + 1;
}

async function loadAndLocate(
  modId: string,
  relativePath: string,
  entityName: string,
): Promise<LocatedEntity> {
  const mod = workspaceStoreService
    .get()
    .includedMods.find((candidate) => candidate.id === modId);
  if (mod === undefined) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: `No editable mod for id: ${modId}`,
    } satisfies IpcError;
  }

  const absolutePath = path.resolve(mod.path, relativePath);
  await assertWritable(absolutePath);
  const source = await readSource(absolutePath);

  const script = parse(source, {
    dialects: dialectsFromPlugins(pluginRegistryService.list()),
  });

  const worklist: BlockChild[] = [...script.children];
  while (worklist.length > 0) {
    const current = worklist.shift();
    if (current === undefined || current.kind !== 'Assignment') continue;
    const value = current.value;
    if (value.kind !== 'Block') continue;
    const name =
      current.key.kind === 'Identifier' ? current.key.name : current.key.value;
    if (name === entityName) {
      return { absolutePath, block: value, node: current, source };
    }
    worklist.push(...value.children);
  }

  throw {
    code: IPC_ERROR_CODES.NOT_FOUND,
    message: `Entity not found: ${entityName}`,
  } satisfies IpcError;
}

async function readSource(absolutePath: string): Promise<string> {
  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch (error: unknown) {
    const errnoCode = (error as NodeJS.ErrnoException | undefined)?.code;
    if (errnoCode === 'ENOENT') {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `File not found: ${absolutePath}`,
      } satisfies IpcError;
    }
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to read file: ${String(error)}`,
    } satisfies IpcError;
  }
}

async function writeEntity(request: EntityWriteRequest): Promise<void> {
  const { absolutePath, block, source } = await loadAndLocate(
    request.modId,
    request.relativePath,
    request.entityName,
  );
  const { delta } = request;

  const scalarByKey = new Map<string, AssignmentNode>();
  const allKeys = new Set<string>();
  for (const child of block.children) {
    if (child.kind !== 'Assignment') continue;
    const name =
      child.key.kind === 'Identifier' ? child.key.name : child.key.value;
    allKeys.add(name);
    if (child.value.kind !== 'Block' && !scalarByKey.has(name)) {
      scalarByKey.set(name, child);
    }
  }

  const edits: SourceEdit[] = [];

  for (const field of delta.changed) {
    const node = scalarByKey.get(field.key);
    if (node === undefined) throw conflict(field.key);
    edits.push({ from: node.value.from, text: field.value, to: node.value.to });
  }

  for (const key of delta.removed) {
    const node = scalarByKey.get(key);
    if (node === undefined) throw conflict(key);
    const from = lineStartOf(source, node.from);
    const newline = source.indexOf('\n', node.to);
    edits.push({
      from,
      text: '',
      to: newline === -1 ? source.length : newline + 1,
    });
  }

  for (const field of delta.added) {
    if (allKeys.has(field.key)) throw conflict(field.key);
  }
  if (delta.added.length > 0) {
    const braceIndex = block.to - 1;
    const insertAt = lineStartOf(source, braceIndex);
    let indent: null | string = null;
    for (const child of block.children) {
      if (child.kind === 'Assignment') {
        indent = source.slice(lineStartOf(source, child.from), child.from);
        break;
      }
    }
    if (indent === null) {
      indent = source.slice(lineStartOf(source, braceIndex), braceIndex) + '\t';
    }
    let text = '';
    for (const field of delta.added) {
      text += `${indent}${field.key} = ${field.value}\n`;
    }
    edits.push({ from: insertAt, text, to: insertAt });
  }

  await writeFileService.writeText(absolutePath, applyEdits(source, edits));
}

export const entityMutationService = {
  delete: deleteEntity,
  write: writeEntity,
} as const;
