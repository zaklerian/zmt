import {
  EntityDeleteRequest,
  EntityField,
  EntityWriteRequest,
  IPC_ERROR_CODES,
  IpcError,
  ProjectedSource,
  Workspace,
} from '@contracts';
import {
  type AssignmentNode,
  type BlockChild,
  type BlockNode,
  parse,
} from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { entityIndexService } from '../entity-index';
import { assertWritable } from './path-guard.util';
import { writeFileService } from './write-file.service';

// The Electron-coupled config the write path used to reach through singletons
// (ADR 027 decision 6): the composition boundary resolves it from the stores and
// passes it in, so this service is pure Node `fs` plus its parameters and never
// constructs an `electron-store`. `workspace` resolves a `modId` to its editable
// mod path; `dialects` select the parser grammar; `sources` are the already-resolved
// projected sources the path guard enforces against.
export interface EntityMutationConfig {
  readonly dialects: readonly string[];
  readonly sources: readonly ProjectedSource[];
  readonly workspace: Workspace;
}

interface AbsentAdd {
  readonly fields: readonly EntityField[];
  readonly tail: readonly string[];
}

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

async function deleteEntity(
  request: EntityDeleteRequest,
  config: EntityMutationConfig,
): Promise<void> {
  const { absolutePath, node, source } = await loadAndLocate(
    request.modId,
    request.relativePath,
    request.entityName,
    config,
  );

  const { from, to } = lineRangeOf(source, node);
  const patched = source.slice(0, from) + source.slice(to);

  await writeFileService.writeText(absolutePath, patched, config.sources);
  // Same-tick guard (ADR 024 decision 5): invalidate the affected entity type's
  // index explicitly so a read after our own write never serves a stale index on
  // a coarse-mtime filesystem, independent of the read-side stat check.
  entityIndexService.invalidateForRelativePath(request.relativePath);
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
  config: EntityMutationConfig,
): Promise<LocatedEntity> {
  const mod = config.workspace.includedMods.find(
    (candidate) => candidate.id === modId,
  );
  if (mod === undefined) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: `No editable mod for id: ${modId}`,
    } satisfies IpcError;
  }

  const absolutePath = path.resolve(mod.path, relativePath);
  await assertWritable(absolutePath, config.sources);
  const source = await readSource(absolutePath);

  const script = parse(source, { dialects: config.dialects });

  const worklist: BlockChild[] = [...script.children];
  while (worklist.length > 0) {
    const current = worklist.shift();
    if (current === undefined || current.kind !== 'Assignment') continue;
    const value = current.value;
    if (value.kind !== 'Block') continue;
    const name =
      current.key.kind === 'StringValue' ? current.key.value : current.key.name;
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

// Renders the absent tails of one or more added-only deltas as nested blocks,
// coalescing deltas that share a path prefix into a single materialized block
// (ADR 019, amended ZMT-15.1). Each `AbsentAdd` carries the missing segment chain
// outermost-first and the fields to place at its deepest level. Deltas are grouped
// by head segment and each group renders as ONE block: those whose tail ends here
// contribute their fields directly into it; those with a longer tail recurse into
// the same shared block. A single delta is the one-element case — terminal
// materialization (a leaf block, or an object-list item past the sibling count)
// and intermediate materialization both fall out byte-identical to before. The
// body emits `renderFields` (a field whose value is itself a `{ … }` block rides
// along as `key = { … }`) before the nested child blocks.
function renderCoalescedBlocks(
  indent: string,
  adds: readonly AbsentAdd[],
): string {
  const groups = new Map<string, AbsentAdd[]>();
  for (const add of adds) {
    const group = groups.get(add.tail[0]);
    if (group === undefined) groups.set(add.tail[0], [add]);
    else group.push(add);
  }
  let text = '';
  for (const [head, group] of groups) {
    const fields: EntityField[] = [];
    const deeper: AbsentAdd[] = [];
    for (const add of group) {
      if (add.tail.length === 1) fields.push(...add.fields);
      else deeper.push({ fields: add.fields, tail: add.tail.slice(1) });
    }
    const inner = indent + '\t';
    text += `${indent}${head} = {\n${renderFields(inner, fields)}${renderCoalescedBlocks(inner, deeper)}${indent}}\n`;
  }
  return text;
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

async function writeEntity(
  request: EntityWriteRequest,
  config: EntityMutationConfig,
): Promise<void> {
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
    config,
  );

  const edits: SourceEdit[] = [];
  // Absent-intermediate materializations are coordinated across the batch, not
  // emitted per-delta (ADR 019, amended ZMT-15.1). Two added-only deltas whose
  // paths share the same absent block (e.g. `['buildings']` and
  // `['buildings', '14']` — a state-wide building and a per-province building object
  // — on a state with no `buildings`) resolve to the same `missingParent` in the one
  // parsed snapshot; keying by that node lets a single rendered block host every
  // sharing delta instead of one block each.
  const materializations = new Map<BlockNode, AbsentAdd[]>();

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
          child.key.kind === 'StringValue' ? child.key.value : child.key.name;
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
      // An added-only delta records its absent tail against the shared
      // `missingParent`; rendering is deferred until after the batch so deltas
      // sharing an absent prefix coalesce into one materialized block. A
      // one-element tail is the terminal-materialization case (a bare-string
      // child created on first write, or an indexed leaf segment past the
      // current sibling count — an object-list item add); a longer tail is an
      // absent intermediate. An EMPTY field list is the bodyless keyed-map add
      // (ZMT-18): the delta still materializes its tail, rendering `<key> = { }`
      // with no body — changed/removed are guaranteed empty here by the throws
      // above, so the all-empty delta is an explicit empty-block creation (the
      // delta builders never emit a no-op empty delta). The prop-bag scalar
      // add-duplicate guard below (allKeys) is never reached here, yet still
      // rejects duplicate scalar keys for a resolved target.
      const add: AbsentAdd = { fields: delta.added, tail: missingTail };
      const sharing = materializations.get(missingParent);
      if (sharing === undefined) materializations.set(missingParent, [add]);
      else sharing.push(add);
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
          child.key.kind === 'StringValue' ? child.key.value : child.key.name;
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
            child.key.kind === 'StringValue' ? child.key.value : child.key.name;
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

  // Render each absent parent's coalesced materializations once, after the batch:
  // one block per parent, hosting every delta that shared it. The insert point and
  // child indentation match the prior per-delta path, so a lone delta is emitted
  // byte-identically. Edits insert before the parent's closing brace; `applyEdits`
  // rebases them against every other delta's offsets in the single buffer.
  for (const [parent, adds] of materializations) {
    let firstFrom: null | number = null;
    for (const child of parent.children) {
      if (child.kind === 'Assignment') {
        firstFrom = child.from;
        break;
      }
    }
    const indent = indentFor(source, firstFrom, parent.to);
    const insertAt = lineStartOf(source, parent.to - 1);
    edits.push({
      from: insertAt,
      text: renderCoalescedBlocks(indent, adds),
      to: insertAt,
    });
  }

  await writeFileService.writeText(
    absolutePath,
    applyEdits(source, edits),
    config.sources,
  );
  // Same-tick guard (ADR 024 decision 5): see deleteEntity.
  entityIndexService.invalidateForRelativePath(request.relativePath);
}

export const entityMutationService = {
  delete: deleteEntity,
  write: writeEntity,
} as const;
