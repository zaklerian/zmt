import {
  EntityDeleteRequest,
  EntityField,
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

interface LineRange {
  readonly from: number;
  readonly to: number;
}

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

  const { from, to } = lineRangeOf(source, node);
  const patched = source.slice(0, from) + source.slice(to);

  await writeFileService.writeText(absolutePath, patched);
}

function indentFor(
  source: string,
  firstChildFrom: null | number,
  blockTo: number,
): string {
  if (firstChildFrom !== null) {
    return source.slice(lineStartOf(source, firstChildFrom), firstChildFrom);
  }
  const braceIndex = blockTo - 1;
  return source.slice(lineStartOf(source, braceIndex), braceIndex) + '\t';
}

function lineRangeOf(source: string, node: LineRange): LineRange {
  const from = lineStartOf(source, node.from);
  const newline = source.indexOf('\n', node.to);
  return { from, to: newline === -1 ? source.length : newline + 1 };
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

function renderFields(indent: string, fields: readonly EntityField[]): string {
  let text = '';
  for (const field of fields) {
    text += `${indent}${field.key} = ${field.value}\n`;
  }
  return text;
}

async function writeEntity(request: EntityWriteRequest): Promise<void> {
  // AST nodes from @paradox-parser are mutable, so descent stays inline on
  // locals: prefer-readonly-parameter-types (P-1) bars node-typed helper params.
  const {
    absolutePath,
    block: entityBlock,
    source,
  } = await loadAndLocate(
    request.modId,
    request.relativePath,
    request.entityName,
  );

  const edits: SourceEdit[] = [];

  for (const delta of request.deltas) {
    let target: BlockNode = entityBlock;
    let childAssignment: AssignmentNode | null = null;

    if (delta.block !== null) {
      let childBlock: BlockNode | null = null;
      for (const child of entityBlock.children) {
        if (child.kind !== 'Assignment' || child.value.kind !== 'Block') {
          continue;
        }
        const name =
          child.key.kind === 'Identifier' ? child.key.name : child.key.value;
        if (name === delta.block) {
          childAssignment = child;
          childBlock = child.value;
          break;
        }
      }

      if (childAssignment === null || childBlock === null) {
        if (delta.changed.length > 0) throw conflict(delta.changed[0].key);
        if (delta.removed.length > 0) throw conflict(delta.removed[0]);
        if (delta.added.length > 0) {
          let firstFrom: null | number = null;
          for (const child of entityBlock.children) {
            if (child.kind === 'Assignment') {
              firstFrom = child.from;
              break;
            }
          }
          const indent = indentFor(source, firstFrom, entityBlock.to);
          const open = `${indent}${delta.block} = {\n`;
          const text = `${open}${renderFields(indent + '\t', delta.added)}${indent}}\n`;
          const insertAt = lineStartOf(source, entityBlock.to - 1);
          edits.push({ from: insertAt, text, to: insertAt });
        }
        continue;
      }

      target = childBlock;
    }

    // Build this delta's edits locally first: the scalar passes below validate
    // (409 on a stale key) before the emptied-block decision discards them.
    const deltaEdits: SourceEdit[] = [];

    const scalarByKey = new Map<string, AssignmentNode>();
    const allKeys = new Set<string>();
    for (const child of target.children) {
      if (child.kind !== 'Assignment') continue;
      const name =
        child.key.kind === 'Identifier' ? child.key.name : child.key.value;
      allKeys.add(name);
      if (child.value.kind !== 'Block' && !scalarByKey.has(name)) {
        scalarByKey.set(name, child);
      }
    }

    for (const field of delta.changed) {
      const node = scalarByKey.get(field.key);
      if (node === undefined) throw conflict(field.key);
      deltaEdits.push({
        from: node.value.from,
        text: field.value,
        to: node.value.to,
      });
    }

    const removed = new Set<string>();
    for (const key of delta.removed) {
      const node = scalarByKey.get(key);
      if (node === undefined) throw conflict(key);
      removed.add(key);
      const { from, to } = lineRangeOf(source, node);
      deltaEdits.push({ from, text: '', to });
    }

    for (const field of delta.added) {
      if (allKeys.has(field.key)) throw conflict(field.key);
    }
    if (delta.added.length > 0) {
      let firstFrom: null | number = null;
      for (const child of target.children) {
        if (child.kind === 'Assignment') {
          firstFrom = child.from;
          break;
        }
      }
      const insertAt = lineStartOf(source, target.to - 1);
      const indent = indentFor(source, firstFrom, target.to);
      deltaEdits.push({
        from: insertAt,
        text: renderFields(indent, delta.added),
        to: insertAt,
      });
    }

    // A removal that clears the last surviving child of a named block drops the
    // whole block rather than leaving `name = { }` behind.
    let emptied =
      childAssignment !== null &&
      delta.added.length === 0 &&
      delta.removed.length > 0;
    if (emptied) {
      for (const child of target.children) {
        const name =
          child.kind === 'Assignment'
            ? child.key.kind === 'Identifier'
              ? child.key.name
              : child.key.value
            : null;
        if (name === null || !removed.has(name)) {
          emptied = false;
          break;
        }
      }
    }
    if (emptied && childAssignment !== null) {
      const { from, to } = lineRangeOf(source, childAssignment);
      edits.push({ from, text: '', to });
    } else {
      edits.push(...deltaEdits);
    }
  }

  await writeFileService.writeText(absolutePath, applyEdits(source, edits));
}

export const entityMutationService = {
  delete: deleteEntity,
  write: writeEntity,
} as const;
