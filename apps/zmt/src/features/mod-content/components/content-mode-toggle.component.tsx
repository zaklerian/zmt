import CodeIcon from '@mui/icons-material/Code';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { ViewMode } from '../../../app/shell/shell-context';

interface ContentModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ContentModeToggle({ mode, onChange }: ContentModeToggleProps) {
  const { t } = useTranslation(['feature.modContent']);

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      onChange={(_event, next: null | ViewMode) => {
        if (next !== null) onChange(next);
      }}
    >
      <Tooltip title={t('feature.modContent:editor.tableView')}>
        <ToggleButton
          aria-label={t('feature.modContent:editor.tableView')}
          value={'table' satisfies ViewMode}
        >
          <TableRowsIcon fontSize="small" />
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
