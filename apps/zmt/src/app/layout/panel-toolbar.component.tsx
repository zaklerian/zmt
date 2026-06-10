import { Box } from '@mui/material';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PanelToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
}

const SLOT_SX = { alignItems: 'center', display: 'flex', gap: 1 } as const;

export function PanelToolbar({ left, right }: PanelToolbarProps) {
  const { t } = useTranslation(['app']);
  return (
    <Box
      aria-label={t('app:panel.toolbar.label')}
      role="toolbar"
      sx={{
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        minHeight: 48,
        px: 2,
      }}
    >
      <Box sx={SLOT_SX}>{left}</Box>
      <Box sx={SLOT_SX}>{right}</Box>
    </Box>
  );
}
