import type { WriteKind } from './write-kind.const';
import type { WriteTarget, WriteTargets } from './write-target.model';

// THE single consult point for "which file does new content of this kind go to"
// (ADR 029 decision 2). Every write that CREATES content no file yet owns resolves
// its destination here; a write that patches a file already owning the content is
// provenance-routed and never calls this.
//
// One rule, in order: the stored preference for (mod, kind) when set; otherwise
// the `fallback` the call site computed; otherwise null. Null keeps today's meaning
// at every call site — refuse the add, drop the loc half — and never invents a file.
//
// TWO ARGUMENTS THE TICKET'S `resolveWriteTarget(kind)` DOES NOT HAVE, and both are
// forced by the code rather than chosen:
//
//   - `fallback`, because today's defaults are computed per CALL SITE and differ
//     within one kind (ADR 029 decision 2 / Context: add-as-child inherits the
//     parent's file, free placement takes the folder's plurality file). It also
//     carries WHICH MOD the write resolved to, and that is the mod the preference is
//     read under — the preference chooses the file inside that mod and never moves a
//     write to a different one.
//   - `targets`, because the preference store is reached differently on each side of
//     the wire (`preferencesService` main-side, `window.api.preferences` renderer-
//     side) and this function is consulted from BOTH. Passing the already-read record
//     keeps it pure and synchronous — the same reason the write boundary takes its
//     sources as a parameter (ADR 027 decision 6).
//
// A stored target is NOT existence-checked: a preference naming a file that does not
// exist yet is exactly the create-new case (decision 3), and the write pairs a
// create-if-absent seed with its content operation. The staleness decision 5 does
// catch is the one resolvable without the filesystem — a preference stored under a
// mod the write did not resolve to (a removed-and-re-added mod mints a new id) is
// simply never read, and the call site's fallback stands.
export function resolveWriteTarget(
  kind: WriteKind,
  fallback: null | WriteTarget,
  targets: WriteTargets,
): null | WriteTarget {
  if (fallback === null) return null;
  const preferred = targets[fallback.modId]?.[kind];
  if (preferred === undefined || preferred.trim() === '') return fallback;
  return { modId: fallback.modId, relativePath: preferred };
}
