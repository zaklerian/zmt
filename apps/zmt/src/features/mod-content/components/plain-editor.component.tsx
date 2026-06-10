import { IpcError, isIpcError } from '@contracts';
import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';

import { useAsyncCallback } from '../../../shared/hooks';
import { useModal } from '../../../shared/modal';
import { useCodeMirror } from '../hooks';
import { modContentService } from '../services/mod-content.service';

interface PlainEditorProps {
  filePath: string;
  writable: boolean;
}

interface PlainEditorSurfaceProps {
  filePath: string;
  initialText: string;
  writable: boolean;
}

type Settled =
  | { error: Error; filePath: string; kind: 'error'; version: number }
  | { filePath: string; kind: 'ready'; text: string; version: number };

export function PlainEditor({ filePath, writable }: PlainEditorProps) {
  const { t } = useTranslation(['app']);
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<null | Settled>(null);

  useEffect(() => {
    let cancelled = false;
    const myVersion = version;
    modContentService
      .readTextFile(filePath)
      .then((text) => {
        if (!cancelled) {
          setSettled({ filePath, kind: 'ready', text, version: myVersion });
        }
      })
      .catch((rawError: unknown) => {
        if (!cancelled) {
          setSettled({
            error:
              rawError instanceof Error
                ? rawError
                : new Error(String(rawError)),
            filePath,
            kind: 'error',
            version: myVersion,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filePath, version]);

  const current =
    settled !== null &&
    settled.filePath === filePath &&
    settled.version === version
      ? settled
      : null;

  if (current === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (current.kind === 'error') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setVersion((value) => value + 1)}
            >
              {t('app:actions.retry')}
            </Button>
          }
          severity="error"
        >
          {current.error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <PlainEditorSurface
      key={filePath}
      filePath={filePath}
      initialText={current.text}
      writable={writable}
    />
  );
}

function PlainEditorSurface({
  filePath,
  initialText,
  writable,
}: PlainEditorSurfaceProps) {
  const { t } = useTranslation(['feature.modContent', 'app']);
  const modal = useModal();
  const originalRef = useRef(initialText);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<IpcError | null>(null);
  const [savedAt, setSavedAt] = useState<null | number>(null);

  const handleDocChange = useCallback((doc: string) => {
    setDirty(doc !== originalRef.current);
  }, []);

  const { containerRef, viewRef } = useCodeMirror({
    editable: writable,
    initialText,
    onDocChange: handleDocChange,
  });

  const save = useAsyncCallback(async () => {
    const view = viewRef.current;
    if (view === null) return;
    setSaveError(null);
    const text = view.state.doc.toString();
    try {
      await modContentService.writeTextFile(filePath, text);
      originalRef.current = text;
      setDirty(false);
      setSavedAt(Date.now());
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: 500, message: String(rawError) };
      setSaveError(error);
    }
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    void (async () => {
      try {
        const proceed = await modal.confirm({
          confirmLabel: t('app:actions.discard'),
          message: t('feature.modContent:editor.unsavedMessage'),
          title: t('app:modals.unsavedChanges.title'),
        });
        if (!active) return;
        if (proceed) blocker.proceed?.();
        else blocker.reset?.();
      } catch {
        if (!active) return;
        blocker.reset?.();
      }
    })();
    return () => {
      active = false;
    };
  }, [blocker, modal, t]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {writable && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            p: 1,
          }}
        >
          <Button
            disabled={!dirty || save.isPending}
            size="small"
            startIcon={
              save.isPending ? (
                <CircularProgress color="inherit" size={16} />
              ) : null
            }
            variant="contained"
            onClick={() => void save.execute()}
          >
            {t('app:actions.save')}
          </Button>
        </Box>
      )}
      {saveError !== null && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {saveError.message}
        </Alert>
      )}
      <Box
        ref={containerRef}
        aria-label={t('feature.modContent:editor.label')}
        sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}
      />
      <Snackbar
        autoHideDuration={3000}
        message={t('feature.modContent:editor.saved')}
        open={savedAt !== null}
        onClose={() => setSavedAt(null)}
      />
    </Box>
  );
}
