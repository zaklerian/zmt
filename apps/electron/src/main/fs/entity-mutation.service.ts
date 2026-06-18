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
    // An absent value (null) is a bare value-list token (e.g. a `traits` entry),
    // written as the token alone; a `key = ` line would be invalid script. ANY
    // value is a `key = value` scalar — including the empty string, which emits
    // `key = ""` (a distinct empty-string scalar, never a bare token; A-TS-1).
    if (field.value === null) {
      text += `${indent}${field.key}\n`;
    } else if (field.value === '') {
      text += `${indent}${field.key} = ""\n`;
    } else {
      text += `${indent}${field.key} = ${field.value}\n`;
    }
  }
  return text;
}

// Renders the absent tail of a scope path as nested blocks, with the add fields at
// the deepest level (ADR 019, amended ZMT-15). `names` is the missing segment
// chain outermost-first: a one-element tail is exactly `renderObjectBlock` (the
// terminal-materialization case, unchanged); a longer tail nests one block per
// intermediate so an added-only write to a path whose intermediate is absent
// materializes the whole chain before the add lands.
function renderNestedObjectBlocks(
  indent: string,
  names: readonly string[],
  fields: readonly EntityField[],
): string {
  const [head, ...rest] = names;
  if (rest.length === 0) return renderObjectBlock(indent, head, fields);
  const inner = renderNestedObjectBlocks(indent + '\t', rest, fields);
  return `${indent}${head} = {\n${inner}${indent}}\n`;
}

// Renders a whole `name = { … }` block for a first-write materialization. Used
// both for a bare-string child created on first write (e.g. a stat block) and for
// an object-list item inserted by an indexed materialization (ZMT-14). The body
// is `renderFields`, which already emits a field whose value is itself a `{ … }`
// block as `key = { … }` — that is how an object-list item's optional nested
// object rides along; `renderFields` alone emits only the loose body lines, never
// the wrapping `name = { … }`.
function renderObjectBlock(
  indent: string,
  name: string,
  fields: readonly EntityField[],
): string {
  return `${indent}${name} = {\n${renderFields(indent + '\t', fields)}${indent}}\n`;
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
    const path = delta.block ?? [];

    // Descend the scope path one named child at a time, re-binding the target
    // block at each level and tracking the deepest assignment for the
    // emptied-block guard. A missing segment is either a stale-edit conflict or,
    // for a leaf add, the create-the-block-on-first-write case.
    let target: BlockNode = entityBlock;
    let deepestAssignment: AssignmentNode | null = null;
    let missingParent: BlockNode | null = null;
    let missingName: null | string = null;
    let missingTail: readonly string[] = [];

    for (let i = 0; i < path.length; i += 1) {
      const segment = path[i];
      // A bare-string segment selects the sole/first named child (existing
      // behavior); an indexed segment selects the index-th same-named sibling —
      // the only form that reaches one of N repeated blocks (object-list). Both
      // count name-matching siblings, so duplicate names are tolerated, and a
      // bare string is exactly index 0 (ADR 019, amended ZMT-14).
      const segmentName = typeof segment === 'string' ? segment : segment.name;
      const segmentIndex = typeof segment === 'string' ? 0 : segment.index;
      let childAssignment: AssignmentNode | null = null;
      let childBlock: BlockNode | null = null;
      let matches = 0;
      for (const child of target.children) {
        if (child.kind !== 'Assignment' || child.value.kind !== 'Block') {
          continue;
        }
        const name =
          child.key.kind === 'Identifier' ? child.key.name : child.key.value;
        if (name !== segmentName) continue;
        if (matches === segmentIndex) {
          childAssignment = child;
          childBlock = child.value;
          break;
        }
        matches += 1;
      }
      if (childAssignment === null || childBlock === null) {
        missingParent = target;
        missingName = segmentName;
        // The absent tail from this segment to the terminal, by name. A one-
        // element tail is a terminal-absent materialization (unchanged); a longer
        // tail is an absent intermediate, materialized for an added-only delta.
        missingTail = path
          .slice(i)
          .map((seg) => (typeof seg === 'string' ? seg : seg.name));
        break;
      }
      deepestAssignment = childAssignment;
      target = childBlock;
    }

    if (missingName !== null && missingParent !== null) {
      // A changed or removed delta against a missing target stays a stale-edit
      // conflict: there is no content to change or remove, and materializing a
      // parent to host a change would invent state the file never had (ADR 019,
      // amended ZMT-15). Only a pure addition is well-defined when its container
      // is absent.
      if (delta.changed.length > 0) throw conflict(delta.changed[0].key);
      if (delta.removed.length > 0) throw conflict(delta.removed[0]);
      if (delta.added.length > 0) {
        // An added-only delta materializes the absent tail. A one-element tail is
        // the terminal-materialization case (a bare-string child created on first
        // write, or an indexed leaf segment whose index is past the current
        // sibling count — an object-list item add); a longer tail nests rendered
        // blocks down the missing intermediate path before the add lands. The
        // prop-bag scalar add-duplicate guard below (allKeys) is never reached
        // here, yet still rejects duplicate scalar keys for a resolved target.
        let firstFrom: null | number = null;
        for (const child of missingParent.children) {
          if (child.kind === 'Assignment') {
            firstFrom = child.from;
            break;
          }
        }
        const indent = indentFor(source, firstFrom, missingParent.to);
        const text = renderNestedObjectBlocks(indent, missingTail, delta.added);
        const insertAt = lineStartOf(source, missingParent.to - 1);
        edits.push({ from: insertAt, text, to: insertAt });
      }
      continue;
    }

    // Build this delta's edits locally first: the passes below validate (409 on
    // a stale key) before the emptied-block decision discards them.
    const deltaEdits: SourceEdit[] = [];

    // `key = value` scalars index by key; named sub-blocks index by their block
    // name (so removing an object-list item that carries a nested object — e.g. a
    // `folder` with a `position` block — drops the whole sub-block, not only its
    // scalars); bare value-list tokens (e.g. `traits` entries) parse as
    // non-Assignment values and index by their token text. All three feed the
    // changed/removed lookups and the add-duplicate guard.
    const scalarByKey = new Map<string, AssignmentNode>();
    const blockByKey = new Map<string, AssignmentNode>();
    const valueByToken = new Map<string, LineRange>();
    const allKeys = new Set<string>();
    for (const child of target.children) {
      if (child.kind === 'Assignment') {
        const name =
          child.key.kind === 'Identifier' ? child.key.name : child.key.value;
        allKeys.add(name);
        if (child.value.kind === 'Block') {
          if (!blockByKey.has(name)) blockByKey.set(name, child);
        } else if (!scalarByKey.has(name)) {
          scalarByKey.set(name, child);
        }
        continue;
      }
      let token: null | string = null;
      if (child.kind === 'Identifier') token = child.name;
      else if (child.kind === 'StringValue') token = child.value;
      else if (child.kind === 'NumberValue' || child.kind === 'DateValue') {
        token = child.raw;
      } else if (child.kind === 'BooleanValue')
        token = child.value ? 'yes' : 'no';
      if (token === null) continue;
      allKeys.add(token);
      if (!valueByToken.has(token)) {
        valueByToken.set(token, lineRangeOf(source, child));
      }
    }

    for (const field of delta.changed) {
      const node = scalarByKey.get(field.key);
      if (node === undefined) throw conflict(field.key);
      deltaEdits.push({
        from: node.value.from,
        // A changed scalar always carries a concrete value; the bare-token marker
        // (absent value) is add/remove-only, never a change to an `= value` RHS.
        text: field.value ?? '',
        to: node.value.to,
      });
    }

    const removed = new Set<string>();
    for (const key of delta.removed) {
      const node = scalarByKey.get(key);
      if (node !== undefined) {
        removed.add(key);
        const { from, to } = lineRangeOf(source, node);
        deltaEdits.push({ from, text: '', to });
        continue;
      }
      const blockNode = blockByKey.get(key);
      if (blockNode !== undefined) {
        removed.add(key);
        const { from, to } = lineRangeOf(source, blockNode);
        deltaEdits.push({ from, text: '', to });
        continue;
      }
      const tokenRange = valueByToken.get(key);
      if (tokenRange === undefined) throw conflict(key);
      removed.add(key);
      deltaEdits.push({ from: tokenRange.from, text: '', to: tokenRange.to });
    }

    for (const field of delta.added) {
      if (allKeys.has(field.key)) throw conflict(field.key);
    }
    if (delta.added.length > 0) {
      let firstFrom: null | number = null;
      for (const child of target.children) {
        if (child.kind !== 'OrphanComment') {
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
    // whole block rather than leaving `name = { }` behind — at any depth, keyed
    // on the deepest descended assignment.
    let emptied =
      deepestAssignment !== null &&
      delta.added.length === 0 &&
      delta.removed.length > 0;
    if (emptied) {
      for (const child of target.children) {
        let name: null | string = null;
        if (child.kind === 'Assignment') {
          name =
            child.key.kind === 'Identifier' ? child.key.name : child.key.value;
        } else if (child.kind === 'Identifier') name = child.name;
        else if (child.kind === 'StringValue') name = child.value;
        else if (child.kind === 'NumberValue' || child.kind === 'DateValue') {
          name = child.raw;
        } else if (child.kind === 'BooleanValue') {
          name = child.value ? 'yes' : 'no';
        }
        if (name === null || !removed.has(name)) {
          emptied = false;
          break;
        }
      }
    }
    if (emptied && deepestAssignment !== null) {
      const { from, to } = lineRangeOf(source, deepestAssignment);
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
