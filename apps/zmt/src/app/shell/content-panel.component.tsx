import { FILE_SUPPORT } from '@contracts';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import {
  EntityActionEnvironment,
  EntityTableData,
  EntityTableRecognizer,
  recognizerRegistry,
  TranslateFn,
} from '@r-core';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EntityTable, PlainEditor } from '../../features/mod-content';
import {
  ModInfoEditPanel,
  modInfoEditService,
} from '../../features/mod-info-edit';
import { entityFormRegistry, EntityFormShell } from '../../shared/entity-form';
import { useModal } from '../../shared/modal';
import { SelectSomethingPlaceholder } from './select-something-placeholder.component';
import { useShell } from './shell-context';

interface RecognizedEntityPanelProps {
  readonly filePath: string;
  readonly modId: null | string;
  readonly recognizer: EntityTableRecognizer;
  readonly relativePath: string;
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
  const {
    activeModId,
    activeModRootPath,
    selectedPath,
    selectedSupport,
    setViewMode,
    viewMode,
  } = useShell();
  if (selectedPath === null) return <SelectSomethingPlaceholder />;

  const writable = activeModRootPath !== null;
  const recognizer = recognizerRegistry.recognize(selectedPath);
  const relativePath = toRelativePath(activeModRootPath, selectedPath);

  // Entity-bearing file: table is the natural view, code mode shows raw text.
  if (recognizer !== null) {
    return viewMode === 'code' ? (
      <PlainEditor filePath={selectedPath} writable={writable} />
    ) : (
      <RecognizedEntityPanel
        filePath={selectedPath}
        modId={activeModId}
        recognizer={recognizer}
        relativePath={relativePath}
        writable={writable}
      />
    );
  }

  // A `.mod` descriptor: the mod-descriptor form is its structured view, code
  // mode shows raw text — mirroring the entity-file toggle above, with plain
  // mode kept available alongside form mode. Cancel closes back to plain.
  if (modInfoEditService.isDescriptorPath(selectedPath)) {
    return viewMode === 'code' ? (
      <PlainEditor filePath={selectedPath} writable={writable} />
    ) : (
      <ModInfoEditPanel
        descriptorPath={selectedPath}
        onCancel={() => setViewMode('code')}
      />
    );
  }

  // Plain supported file: the editor is its natural view. Images (readonly
  // support) and unsupported files keep their current behavior.
  if (selectedSupport === FILE_SUPPORT.editable) {
    return <PlainEditor filePath={selectedPath} writable={writable} />;
  }

  return <SelectSomethingPlaceholder />;
}

function RecognizedEntityPanel({
  filePath,
  modId,
  recognizer,
  relativePath,
  writable,
}: RecognizedEntityPanelProps) {
  const { t } = useTranslation(['app']);
  const modal = useModal();
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<null | Settled>(null);
  const [selection, setSelection] = useState<null | RowSelection>(null);
  const [presentedForm, setPresentedForm] = useState<ReactNode>(null);

  // Recognizers localize cells via the injected translate; a new t reference on
  // locale change re-runs the effect and reloads the table in the new language.
  const translate = useCallback<TranslateFn>(
    (key) => (t as (key: string) => string)(key),
    [t],
  );

  // Capabilities the recognizer's actions need at execute time: file location,
  // modal, a list refresh (version bump), and a slot to mount the plugin's edit
  // form. Stable per inputs so the toolbar context does not churn each render.
  const actionEnv = useMemo<EntityActionEnvironment>(
    () => ({
      dismissForm: () => setPresentedForm(null),
      modal,
      modId,
      presentEntityForm: (gameId, entityId, subject) => {
        if (modId === null) return;
        const descriptor = entityFormRegistry.resolve(gameId, entityId);
        if (descriptor === null) return;
        const model = descriptor.project(subject, {
          modId,
          relativePath,
          translate,
        });
        setPresentedForm(
          <EntityFormShell
            model={model}
            onClose={() => setPresentedForm(null)}
            onSaved={() => setVersion((value) => value + 1)}
          />,
        );
      },
      presentForm: (node) => setPresentedForm(node),
      refresh: () => setVersion((value) => value + 1),
      relativePath,
    }),
    [modId, modal, relativePath, translate],
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
        actionEnv={actionEnv}
        data={current.data}
        selectedRowId={selectedRowId}
        writable={writable}
        onSelectRow={(rowId) =>
          setSelection(rowId === null ? null : { filePath, rowId })
        }
      />
      {presentedForm}
    </Box>
  );
}

function toRelativePath(
  activeModRootPath: null | string,
  selectedPath: string,
): string {
  if (
    activeModRootPath === null ||
    !selectedPath.startsWith(activeModRootPath)
  ) {
    return selectedPath;
  }
  return selectedPath.slice(activeModRootPath.length).replace(/^[/\\]+/, '');
}
