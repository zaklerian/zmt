import {
  EntityBlockDelta,
  EntityField,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';
import {
  type AssignmentNode,
  type BlockChild,
  type BlockNode,
  parse,
} from '@paradox-parser';

// The AST-scoped-delta strategy (ADR 027 decision 2): the Clausewitz-family
// (`.txt`/`.gui`/`.gfx`) format strategy of the write boundary. It is PURE —
// `(source, delta, dialects) → patched bytes`, no fs and no store — so the write
// logic is verifiable in-session without an Electron binary (decision 6). It owns
// the parse → locate → byte-range-edit-on-parsed-nodes mechanism ADR 019 already
// shipped (extracted verbatim from `entity-mutation.service`), and adds `insert`
// as a delta kind (decision 4, closing ledger L-012). A delta is one of:
//   - patch  — change/add/remove scoped fields of an existing named block.
//   - insert — add a new named block into an existing parent block.
//   - delete — remove an existing named block.
//
// P-1 (prefer-readonly-parameter-types) bars passing a mutable `@paradox-parser`
// node as an explicitly-typed parameter, so each kind's compute stays inline after
// a `locateBlock` that RETURNS the nodes (return types are unchecked): helpers
// take strings / offsets / `EntityField`, never nodes.

export interface AstDeleteDelta {
  readonly entityName: string;
  readonly kind: 'delete';
}

export type AstDelta = AstDeleteDelta | AstInsertDelta | AstPatchDelta;

export interface AstInsertDelta {
  // The new block's body as scoped added-fields: an entry with a null `block`
  // targets the new block's own scalars, a scoped `block` nests one named child
  // deeper. Only `added` and `block` are read — a freshly-created block has
  // nothing to change or remove (the Add action compiles to an all-added delta).
  readonly body: readonly EntityBlockDelta[];
  readonly kind: 'insert';
  readonly name: string;
  readonly parentName: string;
}

export interface AstPatchDelta {
  readonly deltas: readonly EntityBlockDelta[];
  readonly entityName: string;
  readonly kind: 'patch';
  // Optional block RENAME, applied in the same edit pass as `deltas` (ZMT-50).
  // It rides the patch rather than being its own delta kind because one batch
  // operation owns one file: two operations on the same path would each stage from
  // the on-disk original and the second would clobber the first. Absent (every
  // caller today) → byte-identical to the pre-ZMT-50 patch.
  //
  // DORMANT PRIMITIVE — NO PRODUCTION CALLER (ZMT-50 review, Q89/Q90). It renames
  // the block's own head identifier ONLY; references to the old name elsewhere in
  // the corpus (`leads_to_tech`, `dependencies`, `token:<id>`, `GFX_<id>_medium`,
  // other mods' overrides) are NOT rewritten. Renaming without that cascade
  // produces dangling references, so no edit path may reach this: the technology
  // edit form freezes the token, and its loc plan has no field that could carry a
  // rename. This exists — implemented and tested — because the deferred
  // reference-cascade work (ledger L-011, its own ADR) needs exactly this
  // primitive, and it is the half that is safe to land now.
  readonly renameTo?: string;
}

interface AbsentAdd {
  readonly fields: readonly EntityField[];
  readonly tail: readonly string[];
}

interface LineRange {
  readonly from: number;
  readonly to: number;
}

interface SourceEdit {
  readonly from: number;
  readonly text: string;
  readonly to: number;
}

// Applies a single AST delta to `source`, returning the patched bytes. Pure: no
// fs, no store. `dialects` selects the parser grammar (decision 6 — passed in, not
// reached through a plugin registry singleton).
export function applyAstDelta(
  source: string,
  delta: AstDelta,
  dialects: readonly string[],
): string {
  switch (delta.kind) {
    case 'delete':
      return applyDeleteDelta(source, dialects, delta);
    case 'insert':
      return applyInsertDelta(source, dialects, delta);
    case 'patch':
      return applyPatchDelta(source, dialects, delta);
  }
}

// The format-minimum valid Clausewitz file, for a target the batch CREATES (ADR
// 027 decision 3 as amended by ZMT-56; ADR 029 decision 3).
//
// The empty string IS the format minimum — verified: `parse('')` returns zero
// errors. What an empty file cannot serve is an INSERT, because `applyInsertDelta`
// locates its `parentName` block and throws `NOT_FOUND` when it is absent. So the
// seed's content is that parent, not a format requirement: `rootBlocks` names the
// wrappers the file's own inserts address (`technologies` for a technology `.txt`,
// `spriteTypes` for a `.gfx`), which is why the seed is per WRITE-KIND and the kind
// supplies it. An empty list seeds a bare parseable file — legal, and useless to an
// insert. Emitted at column 0 with an LF terminator, matching BICE's own
// `technologies = {` (`common/technologies/air_techs.txt:19`); the insert supplies
// the tab indent of the children it adds.
export function seedAstBytes(rootBlocks: readonly string[]): string {
  return rootBlocks.map((name) => `${name} = {\n}\n`).join('');
}

// The strategy's serialize-back check (ADR 027 decision 3, phase 1): the patched
// bytes must re-parse without a parse error, so a delta that would corrupt the
// file's structure is caught before anything is renamed. Throws `INTERNAL` on the
// first parse error.
export function validateAstBytes(
  bytes: string,
  dialects: readonly string[],
): void {
  const script = parse(bytes, { dialects });
  if (script.errors.length > 0) {
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Serialized output failed to re-parse: ${script.errors[0].message}`,
    } satisfies IpcError;
  }
}

function applyDeleteDelta(
  source: string,
  dialects: readonly string[],
  delta: AstDeleteDelta,
): string {
  const located = locateBlock(source, dialects, delta.entityName);
  if (located === null) throw notFound(delta.entityName);
  const { from, to } = lineRangeOf(source, located.node);
  return source.slice(0, from) + source.slice(to);
}

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.from - a.from);
  let out = source;
  for (const edit of ordered) {
    out = out.slice(0, edit.from) + edit.text + out.slice(edit.to);
  }
  return out;
}

function applyInsertDelta(
  source: string,
  dialects: readonly string[],
  delta: AstInsertDelta,
): string {
  const located = locateBlock(source, dialects, delta.parentName);
  if (located === null) throw notFound(delta.parentName);
  const parent = located.block;

  // Reject inserting a block whose name already exists in the parent — mirrors
  // ADR 019's add-duplicate guard so an insert never silently shadows a sibling.
  for (const child of parent.children) {
    if (child.kind !== 'Assignment') continue;
    const childName =
      child.key.kind === 'StringValue' ? child.key.value : child.key.name;
    if (childName === delta.name) throw conflict(delta.name);
  }

  // Compile the body into coalescing materializations rooted at the new block
  // name: a null path is the block's own scalars (tail = [name]); a scoped path
  // nests under it (tail = [name, ...segments]). Indexed segments collapse to
  // their name — nothing exists yet to index against (as the patch path's
  // missing-tail does).
  const adds: AbsentAdd[] = delta.body.map((entry) => ({
    fields: entry.added,
    tail: [
      delta.name,
      ...(entry.block ?? []).map((seg) =>
        typeof seg === 'string' ? seg : seg.name,
      ),
    ],
  }));

  let firstFrom: null | number = null;
  for (const child of parent.children) {
    if (child.kind === 'Assignment') {
      firstFrom = child.from;
      break;
    }
  }
  const indent = indentFor(source, firstFrom, parent.to);
  const insertAt = lineStartOf(source, parent.to - 1);
  return applyEdits(source, [
    { from: insertAt, text: renderCoalescedBlocks(indent, adds), to: insertAt },
  ]);
}

function applyPatchDelta(
  source: string,
  dialects: readonly string[],
  delta: AstPatchDelta,
): string {
  const located = locateBlock(source, dialects, delta.entityName);
  if (located === null) throw notFound(delta.entityName);
  // AST nodes from @paradox-parser are mutable, so descent stays inline on
  // locals: prefer-readonly-parameter-types (P-1) bars node-typed helper params.
  const entityBlock = located.block;

  const edits: SourceEdit[] = [];
  // The optional block rename, as one more byte-range edit in this same pass, so
  // one operation still owns one file. `applyEdits` splices descending-offset, so
  // it composes with the field edits below regardless of their relative positions.
  if (delta.renameTo !== undefined && delta.renameTo !== delta.entityName) {
    const key = located.node.key;
    // A quoted key keeps its quotes; the span covers the literal including them.
    const text =
      key.kind === 'StringValue' ? `"${delta.renameTo}"` : delta.renameTo;
    edits.push({ from: key.from, text, to: key.to });
  }
  // Absent-intermediate materializations are coordinated across the batch, not
  // emitted per-delta (ADR 019, amended ZMT-15.1). Two added-only deltas whose
  // paths share the same absent block (e.g. `['buildings']` and
  // `['buildings', '14']` — a state-wide building and a per-province building object
  // — on a state with no `buildings`) resolve to the same `missingParent` in the one
  // parsed snapshot; keying by that node lets a single rendered block host every
  // sharing delta instead of one block each.
  const materializations = new Map<BlockNode, AbsentAdd[]>();

  for (const blockDelta of delta.deltas) {
    const scopePath = blockDelta.block ?? [];

    // Descend the scope path one named child at a time, re-binding the target
    // block at each level and tracking the deepest assignment for the
    // emptied-block guard. A missing segment is either a stale-edit conflict or,
    // for a leaf add, the create-the-block-on-first-write case.
    let target: BlockNode = entityBlock;
    let deepestAssignment: AssignmentNode | null = null;
    let missingParent: BlockNode | null = null;
    let missingName: null | string = null;
    let missingTail: readonly string[] = [];

    for (let i = 0; i < scopePath.length; i += 1) {
      const segment = scopePath[i];
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
        missingTail = scopePath
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
      if (blockDelta.changed.length > 0)
        throw conflict(blockDelta.changed[0].key);
      if (blockDelta.removed.length > 0) throw conflict(blockDelta.removed[0]);
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
      const add: AbsentAdd = { fields: blockDelta.added, tail: missingTail };
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

    for (const field of blockDelta.changed) {
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
    for (const key of blockDelta.removed) {
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

    for (const field of blockDelta.added) {
      if (allKeys.has(field.key)) throw conflict(field.key);
    }
    if (blockDelta.added.length > 0) {
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
        text: renderFields(indent, blockDelta.added),
        to: insertAt,
      });
    }

    // A removal that clears the last surviving child of a named block drops the
    // whole block rather than leaving `name = { }` behind — at any depth, keyed
    // on the deepest descended assignment.
    let emptied =
      deepestAssignment !== null &&
      blockDelta.added.length === 0 &&
      blockDelta.removed.length > 0;
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

  return applyEdits(source, edits);
}

function conflict(key: string): IpcError {
  return {
    code: IPC_ERROR_CODES.CONFLICT,
    message: `Stale field: ${key}`,
  };
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

// Parses `source` and finds the first block-valued assignment named `name` in
// breadth-first order (the entity-locate ADR 019 has always used). RETURNS the
// mutable nodes so callers bind them to locals — passing a node as an
// explicitly-typed parameter is what P-1 forbids, not returning one.
function locateBlock(
  source: string,
  dialects: readonly string[],
  name: string,
): { block: BlockNode; node: AssignmentNode } | null {
  const script = parse(source, { dialects });
  const worklist: BlockChild[] = [...script.children];
  while (worklist.length > 0) {
    const current = worklist.shift();
    if (current === undefined || current.kind !== 'Assignment') continue;
    const value = current.value;
    if (value.kind !== 'Block') continue;
    const childName =
      current.key.kind === 'StringValue' ? current.key.value : current.key.name;
    if (childName === name) {
      return { block: value, node: current };
    }
    worklist.push(...value.children);
  }
  return null;
}

function notFound(name: string): IpcError {
  return {
    code: IPC_ERROR_CODES.NOT_FOUND,
    message: `Entity not found: ${name}`,
  };
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
