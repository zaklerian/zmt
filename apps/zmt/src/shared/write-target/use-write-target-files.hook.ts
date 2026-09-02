import { IncludedMod, WRITE_KIND_LOCATIONS, WriteKind } from '@contracts';
import { useEffect, useState } from 'react';

import { toModRelativePath } from './write-target-files.util';

export type WriteTargetFiles = Readonly<
  Partial<Record<WriteKind, readonly string[]>>
>;

const EMPTY_FILES: WriteTargetFiles = {};

// The existing files a kind's dropdown offers: the kind's folder inside the mod,
// searched for the kind's extension over the EXISTING `fs:searchFiles` channel — no
// new channel and no new main-side service for what is a file picker.
//
// A missing folder is an EMPTY list, not an error: a mod that has never had a
// `localisation/` folder is exactly the mod the create-new option exists for.
export function useWriteTargetFiles(
  mod: IncludedMod | null,
  kinds: readonly WriteKind[],
): WriteTargetFiles {
  // The listing is held WITH the mod it was read for, so switching mods shows an
  // empty picker until its own listing lands rather than the previous mod's files.
  const [state, setState] = useState<{
    readonly files: WriteTargetFiles;
    readonly modId: null | string;
  }>({ files: {}, modId: null });
  // The kind list is a module-level constant at every call site; joining it keeps
  // the effect from re-running on a fresh array identity each render.
  const kindKey = kinds.join(',');

  useEffect(() => {
    if (mod === null) return;
    let cancelled = false;
    const wanted = kindKey.split(',') as readonly WriteKind[];

    void Promise.all(
      wanted.map(async (kind) => {
        const { extension, folder } = WRITE_KIND_LOCATIONS[kind];
        try {
          const found = await window.api.fs.searchFiles(
            `${mod.path}/${folder}`,
            extension,
          );
          return [
            kind,
            found
              .map((node) => toModRelativePath(mod.path, node.path))
              .sort((a, b) => a.localeCompare(b)),
          ] as const;
        } catch {
          return [kind, []] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled)
        setState({ files: Object.fromEntries(entries), modId: mod.id });
    });

    return () => {
      cancelled = true;
    };
  }, [kindKey, mod]);

  return mod !== null && state.modId === mod.id ? state.files : EMPTY_FILES;
}
