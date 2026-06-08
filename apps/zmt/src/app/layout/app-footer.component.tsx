import { Box, Typography } from '@mui/material';

import { LocaleSwitcher } from '../../shared/locale-switcher';

export function AppFooter() {
  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderTop: 1,
        display: 'flex',
        gap: 2,
        justifyContent: 'space-between',
        px: 2,
        py: 0.5,
      }}
    >
      <Typography color="text.secondary" variant="caption">
        v0.0.1
      </Typography>
      <LocaleSwitcher />
    </Box>
  );
}
