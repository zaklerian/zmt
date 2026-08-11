import type {
  EntityWriteRequest,
  GamePlugin,
  ProjectedSource,
  Workspace,
} from '@contracts';

import { dialectsFromPlugins } from '@paradox-parser';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ParsedFile } from './coverage.util';
import type { RoundTripFailure, WriteRoundTripResult } from './grounding.model';

// Structural mirror of the write service's `EntityMutationConfig` (ADR 027
// decision 6). Declared here rather than imported so the tool does not cross the
// app module boundary at type level (the runtime import stays lazy, below).
interface WriteConfig {
  readonly dialects: readonly string[];
  readonly sources: readonly ProjectedSource[];
  readonly workspace: Workspace;
}

interface WriteContext {
  readonly entityMutationService: {
    write(request: EntityWriteRequest, config: WriteConfig): Promise<void>;
  };
  readonly pluginRegistryService: {
    list(): readonly GamePlugin[];
  };
  readonly workspaceStoreService: {
    addMod(path: string): Workspace;
  };
}

// Drives the REAL `entity-mutation.service` (ADR 019 write path) with an
// unmodified entity — an empty delta — and asserts the written bytes are identical
// to the source. This is done against a scratch MIRROR of the corpus, never the
// corpus itself (gate 5), because the service writes to disk.
//
// The write service itself is now Electron-free (ADR 027 decision 6): it takes its
// config as parameters and never reaches a store. This driver still registers the
// scratch mirror through the electron-store-backed `addMod`, so where an Electron
// runtime is unavailable (electron-store cannot construct without the Electron
// `app`), bootstrapping throws and this step reports `blocked` with the reason — it
// is NEVER counted as passed (ADR 023: a data gate is not satisfied by an argument
// that it must pass). Registering the scratch mod without the store is a later
// harness change; this ticket only removed the Electron edge from the write path.
export async function runWriteRoundTrip(
  entityFiles: readonly ParsedFile[],
  writeTargetsByPath: ReadonlyMap<string, readonly string[]>,
): Promise<WriteRoundTripResult> {
  let scratchRoot: null | string = null;
  try {
    const app = await loadWriteContext();

    scratchRoot = mkdtempSync(join(tmpdir(), 'zmt-grounding-'));
    for (const parsed of entityFiles) {
      const target = join(scratchRoot, parsed.file.relativePath);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(parsed.file.absolutePath, target, { force: true });
    }

    const workspace = app.workspaceStoreService.addMod(scratchRoot);
    const modId = workspace.includedMods[workspace.includedMods.length - 1].id;
    // The write path now takes its config as parameters (ADR 027 decision 6):
    // dialects from the plugin registry, and the scratch mirror as the sole
    // editable source. The config lookups no longer live inside the write service.
    const config: WriteConfig = {
      dialects: dialectsFromPlugins(app.pluginRegistryService.list()),
      sources: [{ path: scratchRoot, permission: 'editable' }],
      workspace,
    };

    const failures: RoundTripFailure[] = [];
    for (const parsed of entityFiles) {
      const targets = writeTargetsByPath.get(parsed.file.relativePath) ?? [];
      for (const entityName of dedupe(targets)) {
        const request: EntityWriteRequest = {
          deltas: [{ added: [], block: null, changed: [], removed: [] }],
          entityName,
          modId,
          relativePath: parsed.file.relativePath,
        };
        await app.entityMutationService.write(request, config);
        const written = readFileSync(
          join(scratchRoot, parsed.file.relativePath),
          'utf8',
        );
        if (written !== parsed.source) {
          failures.push({
            detail: `unmodified write of "${entityName}" changed the file`,
            kind: 'write',
            relativePath: parsed.file.relativePath,
          });
        }
      }
    }
    return { failures, status: 'ran' };
  } catch (error: unknown) {
    return { reason: reasonOf(error), status: 'blocked' };
  } finally {
    if (scratchRoot !== null)
      rmSync(scratchRoot, { force: true, recursive: true });
  }
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

// App-internal imports (the tool observes the app's write path by design, ADR
// 023); the module boundary is crossed deliberately and only here, lazily, so a
// missing Electron runtime degrades to `blocked` rather than crashing the harness.
async function loadWriteContext(): Promise<WriteContext> {
  // eslint-disable-next-line @nx/enforce-module-boundaries
  const plugins = await import('@main/plugins');
  plugins.initializePlugins();
  // eslint-disable-next-line @nx/enforce-module-boundaries
  const workspace = await import('@main/workspace');
  // eslint-disable-next-line @nx/enforce-module-boundaries
  const mutation = await import('@main/fs/entity-mutation.service');
  return {
    entityMutationService: mutation.entityMutationService,
    pluginRegistryService: plugins.pluginRegistryService,
    workspaceStoreService: workspace.workspaceStoreService,
  };
}

function reasonOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `write round-trip could not bootstrap the Electron-main write path: ${message}`;
}
