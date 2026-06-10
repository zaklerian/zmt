import { FILE_SUPPORT } from '@contracts';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  EntityTableData,
  EntityTableRecognizer,
  recognizerRegistry,
  TranslateFn,
} from '@r-core';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EntityTable, PlainEditor } from '../../features/mod-content';
import { SelectSomethingPlaceholder } from './select-something-placeholder.component';
import { useShell } from './shell-context';

interface RecognizedEntityPanelProps {
  readonly filePath: string;
  readonly recognizer: EntityTableRecognizer;
  readonly writable: boolean;
}

interface RowSelection {
  readonly filePath: string;
  readonly rowId: string;
}

type Settled =
  | { data: EntityTableData; filePath: string; kind: 'ready'; version: number }
  | { error: Error; filePath: string; kind: 'error'; version: number };

export function ContentPanel() {
  const { activeModRootPath, selectedPath, selectedSupport, viewMode } =
    useShell();
  if (selectedPath === null) return <SelectSomethingPlaceholder />;

  const writable = activeModRootPath !== null;
  const recognizer = recognizerRegistry.recognize(selectedPath);

  // Entity-bearing file: table is the natural view, code mode shows raw text.
  if (recognizer !== null) {
    return viewMode === 'code' ? (
      <PlainEditor filePath={selectedPath} writable={writable} />
    ) : (
      <RecognizedEntityPanel
        filePath={selectedPath}
        recognizer={recognizer}
        writable={writable}
      />
    );
  }

  // Plain supported file: the editor is its natural view. Images (readonly
  // support) and unsupported files keep their current behavior.
  if (selectedSupport === FILE_SUPPORT.editable) {
    return <PlainEditor filePath={selectedPath} writable={writable} />;
  }

  return <UnrecognizedFile path={selectedPath} />;
}

function RecognizedEntityPanel({
  filePath,
  recognizer,
  writable,
}: RecognizedEntityPanelProps) {
  const { t } = useTranslation(['app']);
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<null | Settled>(null);
  const [selection, setSelection] = useState<null | RowSelection>(null);

  // Recognizers localize cells via the injected translate; a new t reference on
  // locale change re-runs the effect and reloads the table in the new language.
  const translate = useCallback<TranslateFn>(
    (key) => (t as (key: string) => string)(key),
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    const myVersion = version;
    recognizer
      .load(filePath, translate)
      .then((data) => {
        if (!cancelled) {
          setSettled({ data, filePath, kind: 'ready', version: myVersion });
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
  }, [filePath, recognizer, translate, version]);

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

  const selectedRowId =
    selection !== null && selection.filePath === filePath
      ? selection.rowId
      : null;

  return (
    <Box sx={{ height: '100%' }}>
      <EntityTable
        data={current.data}
        selectedRowId={selectedRowId}
        writable={writable}
        onSelectRow={(rowId) =>
          setSelection(rowId === null ? null : { filePath, rowId })
        }
      />
    </Box>
  );
}

function UnrecognizedFile({ path }: { readonly path: string }) {
  return (
    <>
      <SelectSomethingPlaceholder />
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">
          {path}
        </Typography>
      </Box>
    </>
  );
}
