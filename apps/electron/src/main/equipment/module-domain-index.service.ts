import { EquipmentDomain, ProjectedSource } from '@contracts';
import {
  buildArchetypeIndex,
  deriveModuleDomains,
  extractEquipment,
  extractSlots,
} from '@e-game-hoi4';
import { dialectsFromPlugins } from '@paradox-parser';

import { pluginRegistryService } from '../plugins';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';
import { resolveEquipmentFiles } from './resolve-equipment-files.util';

let memo: {
  readonly index: ReadonlyMap<string, EquipmentDomain>;
  readonly signature: string;
} | null = null;

// Workspace-wide category→domain index derived from equipment archetype slots
// across the resolved load order (ADR 017). Memoised on the ordered resolved-root
// signature (ADR 016): the archetype walk recomputes only when the workspace's
// sources change, not per call. Editing an archetype file without changing the
// source set leaves the memo stale — an accepted gap, not reactive invalidation.
export async function moduleDomainIndex(): Promise<
  ReadonlyMap<string, EquipmentDomain>
> {
  const sources = resolveProjectedSources(
    activeGameId(),
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );
  const signature = signatureOf(sources);
  if (memo !== null && memo.signature === signature) {
    return memo.index;
  }

  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  const parsedFiles = await resolveEquipmentFiles(sources, dialects);
  const archetypeIndex = buildArchetypeIndex(parsedFiles);
  const index = deriveModuleDomains(
    parsedFiles
      .flatMap((file) => extractEquipment(file, archetypeIndex))
      .flatMap((entity) => {
        if (entity.classification.status !== 'classified') {
          return [];
        }
        const block = entity.node.value;
        const categories =
          block.kind === 'Block'
            ? extractSlots(block).slots.flatMap(
                (slot) => slot.allowedCategories,
              )
            : [];
        return [{ categories, domain: entity.classification.domain }];
      }),
  );

  memo = { index, signature };
  return index;
}

function signatureOf(sources: readonly ProjectedSource[]): string {
  return sources.map((source) => source.path).join('\n');
}
