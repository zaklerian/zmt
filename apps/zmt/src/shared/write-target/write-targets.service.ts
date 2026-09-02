import { WriteKind, WriteTargets } from '@contracts';

// The renderer's read/write of the `writeTargets` preference (ADR 029 decision 4).
// Thin by design, exactly like `pluginConfigService`: it is the EXISTING
// `preferences:get` / `preferences:set` channel pair over one more key — no new
// channel, no store of its own, no cache. `set` merges rather than replaces so
// choosing a target for one kind never drops another mod's or another kind's.
export const writeTargetsService = {
  async get(): Promise<WriteTargets> {
    return (await window.api.preferences.get('writeTargets')) ?? {};
  },
  async set(
    modId: string,
    kind: WriteKind,
    relativePath: null | string,
  ): Promise<WriteTargets> {
    const current = await writeTargetsService.get();
    const next = mergeWriteTarget(current, modId, kind, relativePath);
    await window.api.preferences.set('writeTargets', next);
    return next;
  },
};

// The merge itself, pure so the per-mod scoping gate can assert it without a store:
// a target is set or cleared for ONE (mod, kind) and every other entry survives.
// Clearing removes the key rather than storing an empty string, so "unset" reads the
// same to `resolveWriteTarget` as it did before anything was ever stored.
export function mergeWriteTarget(
  targets: WriteTargets,
  modId: string,
  kind: WriteKind,
  relativePath: null | string,
): WriteTargets {
  const others = Object.fromEntries(
    Object.entries(targets[modId] ?? {}).filter(([key]) => key !== kind),
  );
  const chosen = relativePath?.trim() ?? '';
  return {
    ...targets,
    [modId]: chosen === '' ? others : { ...others, [kind]: chosen },
  };
}
