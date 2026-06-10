import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from '../../shared/modal';

interface UseEditGuardResult {
  confirmLeaveIfDirty: () => Promise<boolean>;
  registerEditGuard: (predicate: () => boolean) => () => void;
}

// Single-slot registry: one editor is mounted at a time (a shell invariant), so
// the active editor publishes one dirty-predicate. The predicate lives in a ref
// so re-registration on remount never re-renders the shell (A-REACT-3). If a
// future split-view mounts two editors at once this becomes a multi-slot
// registry — note only, do not build for it now (A-PROJ-3).
export function useEditGuard(): UseEditGuardResult {
  const { t } = useTranslation(['feature.modContent', 'app']);
  const modal = useModal();
  const predicateRef = useRef<(() => boolean) | null>(null);

  const registerEditGuard = useCallback((predicate: () => boolean) => {
    predicateRef.current = predicate;
    return () => {
      if (predicateRef.current === predicate) {
        predicateRef.current = null;
      }
    };
  }, []);

  const confirmLeaveIfDirty = useCallback(async (): Promise<boolean> => {
    const predicate = predicateRef.current;
    if (predicate === null || !predicate()) return true;
    try {
      return await modal.confirm({
        confirmLabel: t('app:actions.discard'),
        message: t('feature.modContent:editor.unsavedMessage'),
        title: t('app:modals.unsavedChanges.title'),
      });
    } catch {
      return false;
    }
  }, [modal, t]);

  return { confirmLeaveIfDirty, registerEditGuard };
}
