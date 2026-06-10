import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EntityTable } from '../../features/mod-content';
import {
  EntityTableData,
  EntityTableRecognizer,
  recognizerRegistry,
} from '../../shared/recognizer';
import { SelectSomethingPlaceholder } from './select-something-placeholder.component';
import { useShell } from './shell-context';

interface RecognizedEntityPanelProps {
  readonly filePath: string;
  readonly recognizer: EntityTableRecognizer;
}

interface RowSelection {
  readonly filePath: string;
  readonly rowId: string;
}

type Settled =
  | { data: EntityTableData; filePath: string; kind: 'ready'; version: number }
  | { error: Error; filePath: string; kind: 'error'; version: number };

export function ContentPanel() {
  const { selectedPath } = useShell();
  if (selectedPath === null) return <SelectSomethingPlaceholder />;

  const recognizer = recognizerRegistry.recognize(selectedPath);
  if (recognizer === null) return <UnrecognizedFile path={selectedPath} />;

  return (
    <RecognizedEntityPanel filePath={selectedPath} recognizer={recognizer} />
  );
}

function RecognizedEntityPanel({
  filePath,
  recognizer,
}: RecognizedEntityPanelProps) {
  const { t } = useTranslation(['app']);
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<null | Settled>(null);
  const [selection, setSelection] = useState<null | RowSelection>(null);

  useEffect(() => {
    let cancelled = false;
    const myVersion = version;
    recognizer
      .load(filePath)
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
  }, [filePath, recognizer, version]);

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
