import type { SourcesTable } from '@contracts';
import type { EntityFormModel, TranslateFn } from '@r-core';

import { GAME_IDS } from '@contracts';
import { TECHNOLOGY_ENTITY_ID, technologyLocKeys } from '@r-game-hoi4';
import { useCallback, useState } from 'react';

import { entityFormRegistry } from '../../../shared/entity-form';
import { entityIndexClient } from '../../../shared/entity-index';
import { lookupLocalisation } from '../../../shared/localisation';

export interface TechnologyEdit {
  readonly close: () => void;
  readonly model: EntityFormModel | null;
  readonly open: (id: string) => void;
  readonly status: TechnologyEditStatus;
}

export type TechnologyEditStatus = 'error' | 'idle' | 'loading' | 'readonly';

// Opens the EXISTING `technology-form-descriptor` form for a selected canvas node
// (ADR 028 decision 1) — no new form, no duplicated descriptor. The canvas holds
// slim rows; editing needs the full entity, so this fetches `index:detail`
// (the slim/detail split from ZMT-34) and projects it through the registered
// descriptor, exactly as the ML file view's `presentEntityForm` does.
//
// Two things the ML path gets for free and the canvas must resolve itself:
//   - WHERE to write. The ML form was opened FROM a file, so it had a
//     `relativePath`; a canvas node was never opened from one. Both halves now come
//     off the entity's provenance — its owning file, joined through the companion
//     `SourcesTable` to the owning mod (ADR 024 decision 3).
//   - The LOCALISED NAME. The public-name field reads a `.yml`, which the form has
//     never touched; the loc values are resolved here and passed in on the project
//     context so the descriptor stays free of a fetch.
export function useTechnologyEdit(
  sources: SourcesTable,
  allTechnologyIds: readonly string[],
  translate: TranslateFn,
): TechnologyEdit {
  const [model, setModel] = useState<EntityFormModel | null>(null);
  const [status, setStatus] = useState<TechnologyEditStatus>('idle');

  const close = useCallback(() => {
    setModel(null);
    setStatus('idle');
  }, []);

  const open = useCallback(
    (id: string) => {
      const descriptor = entityFormRegistry.resolve(
        GAME_IDS.hoi4,
        TECHNOLOGY_ENTITY_ID,
      );
      if (descriptor === null) return;
      setStatus('loading');
      setModel(null);

      void (async () => {
        try {
          const detail = await entityIndexClient.detail('technology', id);
          const source = sources[detail.provenance.sourceId];
          // A write targets the editable source that OWNS the entity, never a
          // readonly one (ADR 027 decision 5). Vanilla-owned technologies are the
          // deferred create-override case; the form opens read-only-refused rather
          // than opening an editor whose save could not land.
          if (source === undefined || source.permission !== 'editable') {
            setStatus('readonly');
            return;
          }
          const { modId } = source;
          if (modId === null) {
            setStatus('readonly');
            return;
          }

          const localisation = await lookupLocalisation(
            technologyLocKeys(detail.entity.token),
          );
          setModel(
            descriptor.project(detail.entity, {
              localisation: {
                defaultTarget: localisation.defaultTarget,
                entries: localisation.entries,
                takenIds: allTechnologyIds,
              },
              modId,
              relativePath: detail.provenance.relativePath,
              translate,
            }),
          );
          setStatus('idle');
        } catch {
          setStatus('error');
        }
      })();
    },
    [allTechnologyIds, sources, translate],
  );

  return {
    close,
    model,
    open,
    status,
  };
}
