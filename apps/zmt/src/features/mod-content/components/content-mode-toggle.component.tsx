import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { ViewMode } from '../../../app/shell/shell-context';

interface ContentModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  // The kind of structured view sharing the non-code (`table`) slot: an entity
  // table or the mod-descriptor form. Only the button's icon/label differ; the
  // slot value stays `table` so the existing mode plumbing is unchanged.
  structuredView?: 'form' | 'table';
}

export function ContentModeToggle({
  mode,
  onChange,
  structuredView = 'table',
}: ContentModeToggleProps) {
  const { t } = useTranslation(['feature.modContent']);

  const isForm = structuredView === 'form';
  const structuredLabel = isForm
    ? t('feature.modContent:editor.formView')
    : t('feature.modContent:editor.tableView');
  const StructuredIcon = isForm ? DescriptionIcon : TableRowsIcon;

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      onChange={(_event, next: null | ViewMode) => {
        if (next !== null) onChange(next);
      }}
    >
      <Tooltip title={structuredLabel}>
        <ToggleButton
          aria-label={structuredLabel}
          value={'table' satisfies ViewMode}
        >
          <StructuredIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title={t('feature.modContent:editor.codeView')}>
        <ToggleButton
          aria-label={t('feature.modContent:editor.codeView')}
          value={'code' satisfies ViewMode}
        >
          <CodeIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
