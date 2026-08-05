import { promises as fs } from 'node:fs';
import path, { posix } from 'node:path';

import type { IndexSource } from '../entity-index/entity-index.model';
import type { ResolutionSource, ResolvedFile } from '../resolution';
import type {
  AssetProvenance,
  AssetResolution,
} from './asset-resolution.model';

import { resolveLoadOrder } from '../resolution';

// Texture formats HOI4 treats as interchangeable for a single logical asset: a
// `.gfx` may reference `foo.tga` while `foo.dds` is what actually ships (BICE
// survey). Extension matching within a source's directory tries the requested
// extension first, then this family. Kept small and explicit rather than "any
// image" — an unrelated `.png` beside the target must NOT satisfy the reference.
const EXTENSION_FAMILY = ['.dds', '.tga'] as const;

// A per-source probe result: the actual on-disk relative path (case/extension as
// the file truly is) for a source that provides the asset.
interface AssetMatch {
  readonly relativePath: string;
  readonly root: string;
}

// Resolution B (ZMT-39): resolve a sprite's raw `texturefile` to the actual file
// on disk across the projected sources, lowest→highest precedence. The probe
// absorbs the survey's messiness (normalize `//` and `\`, case-insensitive
// directory match, `.tga`↔`.dds` family) and hands each source's ACTUAL matched
// relative path to `resolveLoadOrder` — the same stage-1 primitive the entity
// index and tech-tree geometry use — under one shared key so cross-source
// providers (e.g. vanilla and BICE both shipping the file) collide and last-wins
// picks the winner with a proper `reason` and shadowed set. No stage 2: a texture
// has no inner entity. An asset no source provides returns a clean `unresolved`.
export async function resolveAssetFile(
  sources: readonly IndexSource[],
  rawTexturePath: string,
): Promise<AssetResolution> {
  const normalized = normalizeAssetPath(rawTexturePath);
  const dir = posix.dirname(normalized);
  const stem = basenameStem(normalized);
  const ext = posix.extname(normalized).toLowerCase();

  if (stem === '') {
    return { requestedPath: rawTexturePath, status: 'unresolved' };
  }

  const matchByRoot = new Map<string, AssetMatch>();
  await Promise.all(
    sources.map(async (source) => {
      const match = await probeSource(source.path, dir, stem, ext);
      if (match !== null) {
        matchByRoot.set(source.path, {
          relativePath: match,
          root: source.path,
        });
      }
    }),
  );

  // One shared key across every providing source so the resolver collides them and
  // resolves last-wins; sources without a match contribute an empty file list, so
  // the resolver's `reason`/shadowing stays honest to the real load order.
  const key = normalized.toLowerCase();
  const resolutionSources: readonly ResolutionSource[] = sources.map(
    (source) => ({
      files: matchByRoot.has(source.path) ? [key] : [],
      replacePaths: [],
      root: source.path,
    }),
  );

  const resolved = resolveLoadOrder(resolutionSources);
  const winner = resolved[0];
  if (winner === undefined) {
    return { requestedPath: rawTexturePath, status: 'unresolved' };
  }

  return {
    provenance: provenanceOf(winner, matchByRoot, sources),
    requestedPath: rawTexturePath,
    status: 'resolved',
  };
}

function basenameStem(normalized: string): string {
  const base = posix.basename(normalized);
  const ext = posix.extname(base);
  return ext === '' ? base : base.slice(0, base.length - ext.length);
}

function joinRelative(dir: string, name: string): string {
  return dir === '.' ? name : `${dir}/${name}`;
}

// Normalizes a raw texture path as written in a `.gfx`: backslashes to forward,
// collapse the `gfx//interface//…` double-slashes BICE writes, drop a leading
// slash, and trim. Case is preserved here (the on-disk match is case-insensitive
// in the probe); only separators and duplication are canonicalized.
function normalizeAssetPath(raw: string): string {
  return raw
    .trim()
    .replaceAll('\\', '/')
    .replaceAll(/\/+/g, '/')
    .replace(/^\//, '');
}

// Probes one source's target directory for a file whose stem matches (case-
// insensitively) with an accepted extension. Exact requested extension wins;
// otherwise the first family match (`.dds`/`.tga`) is taken. Returns the actual
// on-disk relative path or null. A missing directory yields null, not an error.
async function probeSource(
  root: string,
  dir: string,
  stem: string,
  requestedExt: string,
): Promise<null | string> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, dir), { withFileTypes: true });
  } catch {
    return null;
  }

  const lowerStem = stem.toLowerCase();
  let familyMatch: null | string = null;
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const entryExt = posix.extname(entry.name).toLowerCase();
    const entryStem = entry.name
      .slice(0, entry.name.length - entryExt.length)
      .toLowerCase();
    if (entryStem !== lowerStem) {
      continue;
    }
    if (entryExt === requestedExt) {
      return joinRelative(dir, entry.name);
    }
    if (
      familyMatch === null &&
      (EXTENSION_FAMILY as readonly string[]).includes(entryExt)
    ) {
      familyMatch = joinRelative(dir, entry.name);
    }
  }
  return familyMatch;
}

function provenanceOf(
  winner: ResolvedFile,
  matchByRoot: ReadonlyMap<string, AssetMatch>,
  sources: readonly IndexSource[],
): AssetProvenance {
  const root = winner.winningSource.root;
  const match = matchByRoot.get(root);
  const source = sources.find((candidate) => candidate.path === root);
  const relativePath = match?.relativePath ?? winner.relativePath;
  return {
    absolutePath: posix.join(root, relativePath),
    modId: source?.modId ?? null,
    permission: source?.permission ?? 'readonly',
    reason: winner.reason,
    relativePath,
    shadowedSourceIds: winner.shadowedSources.map((shadowed) => shadowed.root),
    sourceId: root,
  };
}
