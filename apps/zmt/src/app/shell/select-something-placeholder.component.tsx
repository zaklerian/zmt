import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function SelectSomethingPlaceholder() {
  const { t } = useTranslation(['app']);
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary" variant="body2">
        {t('emptyStates.selectModRoot')}
      </Typography>
    </Box>
  );
}
