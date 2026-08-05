import type { ModId, Workspace } from '@contracts';

import { DESCRIPTOR_FILENAME } from '@contracts';
import { parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ResolutionSource } from '../resolution';

// A projected source for the geometry read: mod id + path only. Geometry is a
// standalone resolved-file read, deliberately NOT the entity index (ADR 025
// decision 2), so it projects its own minimal source list rather than importing
// the index's `IndexSource`/`resolveIndexSources` — the parallel to that shape is
// intentional, the decoupling the point.
export interface GeometrySource {
  readonly modId: ModId | null;
  readonly path: string;
}

// Enumerates the tree-view `.gui` candidate paths across the projected sources,
// shaped for `resolveLoadOrder` (ADR 016 stage 1): each source contributes the
// candidate files it actually declares plus its `replace_path` declarations. A
// source missing every candidate contributes an empty file list rather than
// failing the enumeration.
export async function enumerateTreeViewGuiSources(
  sources: readonly GeometrySource[],
  guiPaths: readonly string[],
  dialects: readonly string[],
): Promise<readonly ResolutionSource[]> {
  return Promise.all(
    sources.map(async (source) => ({
      files: await presentFiles(source.path, guiPaths),
      replacePaths: await readReplacePaths(source.path, dialects),
      root: source.path,
    })),
  );
}

// Projects the workspace into the ordered source list the geometry read resolves
// across, lowest → highest precedence (ADR 016): the vanilla game folder first
// (mod id null, so mods override it), then the included mods in order. Mirrors the
// index's `resolveIndexSources` minus the `permission` a read-only projection does
// not need.
export function projectGeometrySources(
  workspace: Workspace,
  gameFolderPath: null | string,
): readonly GeometrySource[] {
  const mods: readonly GeometrySource[] = workspace.includedMods.map((mod) => ({
    modId: mod.id,
    path: mod.path,
  }));

  if (typeof gameFolderPath === 'string' && gameFolderPath.length > 0) {
    return [{ modId: null, path: gameFolderPath }, ...mods];
  }

  return mods;
}

async function presentFiles(
  root: string,
  guiPaths: readonly string[],
): Promise<readonly string[]> {
  const checked = await Promise.all(
    guiPaths.map(async (relativePath) => {
      try {
        await fs.access(path.join(root, relativePath));
        return relativePath;
      } catch {
        return null;
      }
    }),
  );
  return checked.filter(
    (relativePath): relativePath is string => relativePath !== null,
  );
}

async function readReplacePaths(
  root: string,
  dialects: readonly string[],
): Promise<readonly string[]> {
  let text;
  try {
    text = await fs.readFile(path.join(root, DESCRIPTOR_FILENAME), 'utf8');
  } catch {
    return [];
  }

  const replacePaths: string[] = [];
  for (const child of parse(text, { dialects }).children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const key =
      child.key.kind === 'StringValue' ? child.key.value : child.key.name;
    if (key !== 'replace_path') {
      continue;
    }
    if (child.value.kind === 'StringValue') {
      replacePaths.push(child.value.value);
    } else if (child.value.kind === 'Identifier') {
      replacePaths.push(child.value.name);
    }
  }
  return replacePaths;
}
