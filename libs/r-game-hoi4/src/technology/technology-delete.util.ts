import {
  EntityBatchOperation,
  EntityLocBatchOperation,
  EntityScriptDeleteBatchOperation,
  LocalisationEntry,
  LocDelta,
  TechnologyDeletePlan,
} from '@contracts';

import { technologyLocKeys } from './technology-loc-keys.util';

// The ONE atomic batch a delete commits (ADR 027 + ADR 028 decision 5): every
// technology block removed from its `.txt` and every loc key it owns removed from
// its `.yml`, all-or-nothing.
//
// Both halves GROUP BY FILE, because one batch operation owns one file
// (`assertOneOperationPerFile`) and a delete-tree routinely puts several
// technologies — and several of their loc keys — in the same file. Per file the
// deletions ride ONE operation's ordered delta list; the file order and the
// within-file order follow the plan's traversal order, so a batch is reproducible
// from the same plan.
//
// A key resolving to a readonly (vanilla) source is SKIPPED, not deleted: there
// is nothing of ours in that file to remove, and writing it would be an override
// this ticket does not create.
export function buildTechnologyDeleteOperations(
  plan: TechnologyDeletePlan,
  entries: readonly LocalisationEntry[],
): readonly EntityBatchOperation[] {
  const script = new Map<string, EntityScriptDeleteBatchOperation>();
  for (const target of plan.targets) {
    const key = fileKey(target.modId, target.relativePath);
    const existing = script.get(key);
    script.set(key, {
      entityNames: [...(existing?.entityNames ?? []), target.token],
      format: 'scriptDelete',
      modId: target.modId,
      relativePath: target.relativePath,
    });
  }

  const loc = new Map<string, EntityLocBatchOperation>();
  for (const target of plan.targets) {
    for (const locKey of technologyLocKeys(target.token)) {
      const entry = entries.find((candidate) => candidate.key === locKey);
      if (entry?.target == null || entry.permission !== 'editable') continue;
      const key = fileKey(entry.target.modId, entry.target.relativePath);
      const existing = loc.get(key);
      const delta: LocDelta = { key: locKey, kind: 'delete' };
      loc.set(key, {
        deltas: [...(existing?.deltas ?? []), delta],
        format: 'loc',
        modId: entry.target.modId,
        relativePath: entry.target.relativePath,
      });
    }
  }

  return [...script.values(), ...loc.values()];
}

// Every loc key the deleted set could own, for the one `localisation:lookup` the
// delete needs. Which of them EXIST is the lookup's answer, never assumed here —
// a technology's `_desc` / `_short` keys are optional (ZMT-50 grounding), and on
// the canvas's own folder none of the 35 base air technologies owns any BICE key
// at all (their names live in vanilla), so a delete there is script-only.
export function technologyDeleteLocKeys(
  plan: TechnologyDeletePlan,
): readonly string[] {
  return plan.targets.flatMap((target) => technologyLocKeys(target.token));
}

// A mod-scoped file identity. The NUL separator cannot occur in either half, so
// two different files can never collide onto one operation.
function fileKey(modId: string, relativePath: string): string {
  return `${modId}\u0000${relativePath}`;
}
