import { FeatureContribution } from '@contracts';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface FeatureTreePlaceholderProps {
  feature: FeatureContribution | null;
}

// The tree-view region in nav mode. It reads the active feature and stands in
// for the canvas, which a later ticket fills. Empty (no selection) vs. selected
// are the only two states — no tree yet.
export function FeatureTreePlaceholder({
  feature,
}: FeatureTreePlaceholderProps) {
  const { t } = useTranslation(['app']);

  if (feature === null) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          {t('app:nav.noSelection')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Stack alignItems="center" spacing={1}>
        <Typography variant="h6">{feature.label}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t('app:nav.treePlaceholder.title')}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {t('app:nav.treePlaceholder.caption')}
        </Typography>
      </Stack>
    </Box>
  );
}
