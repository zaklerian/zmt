import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { PANEL_MODES, PanelMode } from '../panel-mode.const';

interface NavModeToggleProps {
  mode: PanelMode;
  onChange: (mode: PanelMode) => void;
}

export function NavModeToggle({ mode, onChange }: NavModeToggleProps) {
  const { t } = useTranslation(['app']);
  const fileLabel = t('app:layout.panelMode.file');
  const navLabel = t('app:layout.panelMode.nav');

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      onChange={(_event, next: null | PanelMode) => {
        if (next !== null) onChange(next);
      }}
    >
      <Tooltip title={fileLabel}>
        <ToggleButton
          aria-label={fileLabel}
          value={PANEL_MODES.file satisfies PanelMode}
        >
          <FolderOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title={navLabel}>
        <ToggleButton
          aria-label={navLabel}
          value={PANEL_MODES.nav satisfies PanelMode}
        >
          <ViewListIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
