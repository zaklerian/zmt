import {
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  MAX_PAYLOAD_BYTES,
  ProjectedSource,
} from '@contracts';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AstDelta } from './ast-scoped-delta.strategy';

import { applyAstDelta, validateAstBytes } from './ast-scoped-delta.strategy';
import { assertWritable } from './path-guard.util';

// The cross-file two-phase atomic batch (ADR 027 decision 3). It generalizes
// `write-file`'s single-file `atomicWrite` (temp-write + rename + path-guard) to N
// files applied ALL-OR-NOTHING, routing each operation to its format strategy
// (decision 1). It is pure Node `fs` (decision 6): the path guard's projected
// `sources` and the parser `dialects` are passed in, never reached through a
// store, so the batch is verifiable in-session without an Electron binary.
//
// THE GUARANTEE AND ITS LIMIT. Either every file lands, or — on a phase-1 failure
// — none is touched, or — on a phase-2 failure — the already-committed files are
// rolled back from backups. True multi-file ACID is impossible on a filesystem the
// tool does not own; the residual window is a phase-2 rename (or a rollback rename)
// failing after an earlier rename already committed. It is MINIMIZED by
// construction — all writes, validation, and serialize-back checks live in phase 1,
// so phase 2 is nothing but fast renames — and it is DOCUMENTED here, not hidden.
// This is not ACID.

export interface AstWriteOperation {
  readonly absolutePath: string;
  readonly delta: AstDelta;
  readonly format: 'ast';
}

// loc-lines (`.yml` localisation) is the second format strategy (ADR 027 decision
// 2) and the NEXT ticket. It is modeled here so a loc operation is a typed,
// explicit rejection at the boundary rather than a silent gap — no loc reader or
// writer is built in this ticket (scope).
export interface LocWriteOperation {
  readonly absolutePath: string;
  readonly format: 'loc';
}

export interface WriteBatchConfig {
  readonly dialects: readonly string[];
  readonly sources: readonly ProjectedSource[];
}

export type WriteOperation = AstWriteOperation | LocWriteOperation;

interface StagedWrite {
  readonly absolutePath: string;
  readonly backupPath: string;
  readonly tempPath: string;
}

// Applies a batch of `{ file, format, delta }` operations all-or-nothing across
// every file it touches (ADR 027 decision 3). Phase 1 stages and validates every
// target; only if all succeed does phase 2 commit them by rename, rolling back
// from backups on any phase-2 failure. See the file header for the guarantee and
// its residual-window limit.
export async function applyWriteBatch(
  operations: readonly WriteOperation[],
  config: WriteBatchConfig,
): Promise<void> {
  const staged = await stageAll(operations, config);
  await commitAll(staged);
}

async function commitAll(staged: readonly StagedWrite[]): Promise<void> {
  const renamed: { backup: string; target: string }[] = [];
  try {
    for (const s of staged) {
      await fs.rename(s.absolutePath, s.backupPath); // (A) original -> backup
      try {
        await fs.rename(s.tempPath, s.absolutePath); // (B) temp -> target
      } catch (error: unknown) {
        // (B) failed after (A) committed: the original is at its backup and the
        // target is gone. Restore this op's original before aborting so it, too,
        // is intact when the outer rollback runs for the earlier ops.
        try {
          await fs.rename(s.backupPath, s.absolutePath);
        } catch {
          /* residual window — this op cannot be restored (see file header) */
        }
        throw error;
      }
      renamed.push({ backup: s.backupPath, target: s.absolutePath });
    }
  } catch (error: unknown) {
    // Phase-2 failure: roll every already-committed target back from its backup,
    // newest-first, leaving the tree as it began. A restore rename that itself
    // fails is the irreducible residual window (see file header) — swallowed,
    // documented, and minimized by keeping phase 2 renames-only.
    for (const r of [...renamed].reverse()) {
      try {
        await fs.rename(r.backup, r.target);
      } catch {
        /* irreducible residual window — see file header */
      }
    }
    // Temps of committed ops were consumed by their (B) rename; the failing op's
    // and any untouched op's temps remain and are removed here.
    for (const s of staged) {
      try {
        await fs.unlink(s.tempPath);
      } catch {
        /* consumed by a successful rename, or never written */
      }
    }
    throw isIpcError(error)
      ? error
      : ({
          code: IPC_ERROR_CODES.INTERNAL,
          message: `Failed to commit write batch: ${String(error)}`,
        } satisfies IpcError);
  }

  // Success: every target now holds its new bytes; drop the backups.
  for (const r of renamed) {
    try {
      await fs.unlink(r.backup);
    } catch {
      /* best-effort; a lingering backup does not affect the committed tree */
    }
  }
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

async function stageAll(
  operations: readonly WriteOperation[],
  config: WriteBatchConfig,
): Promise<readonly StagedWrite[]> {
  const staged: StagedWrite[] = [];
  try {
    for (const operation of operations) {
      staged.push(await stageOne(operation, config));
    }
  } catch (error: unknown) {
    // Phase-1 failure: nothing has been renamed, so aborting is only deleting
    // every temp already written. The tree is left exactly as it began.
    for (const s of staged) {
      try {
        await fs.unlink(s.tempPath);
      } catch {
        /* best-effort; temp may not exist */
      }
    }
    throw error;
  }
  return staged;
}

// Phase 1 for one operation: route to the format strategy, apply the delta in
// memory, validate (path-guard/readonly, byte-length ceiling, serialize-back), and
// temp-write the target to a sibling temp file. All fallible content and path work
// happens here; nothing is renamed. Throws before writing any temp on a strategy,
// guard, or validation failure.
async function stageOne(
  operation: WriteOperation,
  config: WriteBatchConfig,
): Promise<StagedWrite> {
  // loc is not handled in this ticket (ADR 027 decision 2 / scope); reject it
  // explicitly rather than mis-route it through the AST strategy.
  if (operation.format !== 'ast') {
    throw {
      code: IPC_ERROR_CODES.UNSUPPORTED_MEDIA,
      message: `Unsupported write format: ${String(operation.format)}`,
    } satisfies IpcError;
  }

  await assertWritable(operation.absolutePath, config.sources);
  const source = await readSource(operation.absolutePath);
  const patched = applyAstDelta(source, operation.delta, config.dialects);

  const byteLength = Buffer.byteLength(patched, 'utf8');
  if (byteLength > MAX_PAYLOAD_BYTES) {
    throw {
      code: IPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: `Payload exceeds ${String(MAX_PAYLOAD_BYTES)} bytes`,
    } satisfies IpcError;
  }
  validateAstBytes(patched, config.dialects);

  const parent = path.dirname(operation.absolutePath);
  const base = path.basename(operation.absolutePath);
  // One suffix per op keys the temp and its backup together; the dot prefix and
  // sibling directory keep the later rename same-filesystem and atomic.
  const suffix = randomBytes(8).toString('hex');
  const tempPath = path.join(parent, `.${base}.${suffix}.tmp`);
  const backupPath = path.join(parent, `.${base}.${suffix}.bak`);

  try {
    await fs.writeFile(tempPath, patched);
  } catch (error: unknown) {
    try {
      await fs.unlink(tempPath);
    } catch {
      /* temp may not exist */
    }
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to stage write: ${String(error)}`,
    } satisfies IpcError;
  }

  return { absolutePath: operation.absolutePath, backupPath, tempPath };
}
