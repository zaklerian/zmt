import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { ConfirmOptions, InfoOptions, ModalContextValue } from './modal.model';
import { ModalContextProvider } from './use-modal.hook';

type ActiveModal =
  | {
      kind: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | { kind: 'info'; options: InfoOptions; resolve: () => void };

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [active, setActive] = useState<ActiveModal | null>(null);
  const activeRef = useRef<ActiveModal | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    if (activeRef.current !== null) {
      return Promise.reject(new Error('Modal already open'));
    }
    return new Promise<boolean>((resolve) => {
      const next: ActiveModal = { kind: 'confirm', options, resolve };
      activeRef.current = next;
      setActive(next);
    });
  }, []);

  const info = useCallback((options: InfoOptions): Promise<void> => {
    if (activeRef.current !== null) {
      return Promise.reject(new Error('Modal already open'));
    }
    return new Promise<void>((resolve) => {
      const next: ActiveModal = { kind: 'info', options, resolve };
      activeRef.current = next;
      setActive(next);
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    const current = activeRef.current;
    if (current === null || current.kind !== 'confirm') return;
    activeRef.current = null;
    setActive(null);
    current.resolve(value);
  };

  const closeInfo = () => {
    const current = activeRef.current;
    if (current === null || current.kind !== 'info') return;
    activeRef.current = null;
    setActive(null);
    current.resolve();
  };

  const handleDialogClose = () => {
    const current = activeRef.current;
    if (current === null) return;
    if (current.kind === 'confirm') {
      closeConfirm(false);
    } else {
      closeInfo();
    }
  };

  const contextValue = useMemo<ModalContextValue>(
    () => ({ confirm, info }),
    [confirm, info],
  );

  const confirmLabel = active?.options.confirmLabel ?? 'Confirm';
  const cancelLabel =
    active?.kind === 'confirm'
      ? (active.options.cancelLabel ?? 'Cancel')
      : null;

  return (
    <ModalContextProvider value={contextValue}>
      {children}
      {active !== null && (
        <Dialog open onClose={handleDialogClose}>
          <DialogTitle>{active.options.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{active.options.message}</DialogContentText>
          </DialogContent>
          <DialogActions>
            {active.kind === 'confirm' && cancelLabel !== null && (
              <Button onClick={() => closeConfirm(false)}>{cancelLabel}</Button>
            )}
            <Button
              autoFocus
              variant="contained"
              onClick={() =>
                active.kind === 'confirm' ? closeConfirm(true) : closeInfo()
              }
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </ModalContextProvider>
  );
}
