import type {
  TechnologyDeletePlan,
  TechnologyDeletePlanResult,
} from '@contracts';

import {
  buildTechnologyDeleteOperations,
  technologyDeleteLocKeys,
} from '@r-game-hoi4';
import { useCallback, useState } from 'react';

import { lookupLocalisation } from '../../../shared/localisation';
import { technologyDeletePlan } from '../../../shared/technology';

export interface TechnologyDelete {
  readonly cancel: () => void;
  // Commits the chosen mode's plan as ONE atomic batch. The confirmation is the
  // dialog the plan drives; there is no second prompt here.
  readonly commit: (mode: TechnologyDeleteMode) => void;
  readonly open: (id: string) => void;
  // The server-computed plan for both modes, null while nothing is pending. It IS
  // the confirmation's content — the counts and the dangling-reference warning are
  // rendered from it, never recomputed renderer-side (R-CODE-5).
  readonly plan: null | TechnologyDeletePlanResult;
  readonly status: TechnologyDeleteStatus;
  readonly token: null | string;
}

export type TechnologyDeleteMode = 'item' | 'tree';

export type TechnologyDeleteStatus =
  | 'deleting'
  | 'error'
  | 'idle'
  | 'loading'
  | 'readonly';

// The delete half of the canvas's mutation surface (ZMT-52), the third consumer
// of the ADR 028 shared model after edit (ZMT-50) and add (ZMT-51).
//
// It is a two-step: `open` asks the MAIN side what the delete would remove — the
// descendant closure and the technologies left pointing into it, neither of which
// the renderer can compute from one folder's rows — and holds that plan for the
// confirmation to render. `commit` then resolves the deleted set's loc keys
// through the existing `localisation:lookup` read and ships the whole thing as
// ONE `entity:writeBatch`: every technology block and every loc key it owns land
// together or not at all (ADR 027 decision 3).
//
// INBOUND REFERENCES ARE WARNED, NEVER REWRITTEN (Q93 = A1). Nothing here touches
// a technology outside the deleted set; the warned references dangle, which is a
// soft in-game error, until the L-011 worker cascade lands.
export function useTechnologyDelete(onDeleted: () => void): TechnologyDelete {
  const [plan, setPlan] = useState<null | TechnologyDeletePlanResult>(null);
  const [status, setStatus] = useState<TechnologyDeleteStatus>('idle');
  const [token, setToken] = useState<null | string>(null);

  const cancel = useCallback(() => {
    setPlan(null);
    setStatus('idle');
    setToken(null);
  }, []);

  const commit = useCallback(
    (mode: TechnologyDeleteMode) => {
      const chosen: null | TechnologyDeletePlan = plan?.[mode] ?? null;
      if (chosen === null) return;
      // A set containing a vanilla-owned technology is refused WHOLE: deleting the
      // editable part would leave the rest behind, half a tree removed and the
      // remainder pointing at nothing. The create-override route ADR 027 decision
      // 5 designs is what would answer it, and it is deferred.
      if (chosen.blocked.length > 0 || chosen.targets.length === 0) {
        setStatus('readonly');
        return;
      }
      setStatus('deleting');

      void (async () => {
        try {
          const localisation = await lookupLocalisation(
            technologyDeleteLocKeys(chosen),
          );
          await window.api.entity.writeBatch({
            operations: buildTechnologyDeleteOperations(
              chosen,
              localisation.entries,
            ),
          });
          setPlan(null);
          setStatus('idle');
          setToken(null);
          onDeleted();
        } catch {
          setStatus('error');
        }
      })();
    },
    [onDeleted, plan],
  );

  const open = useCallback((id: string) => {
    setStatus('loading');
    setPlan(null);
    setToken(id);

    void (async () => {
      try {
        setPlan(await technologyDeletePlan(id));
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  return { cancel, commit, open, plan, status, token };
}
