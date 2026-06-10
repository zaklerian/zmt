import { ProjectedSource } from '@contracts';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { toBreadcrumbTrail } from './panel-breadcrumbs.util';

interface PanelBreadcrumbsProps {
  selectedPath: null | string;
  readonly sources: readonly ProjectedSource[];
}

export function PanelBreadcrumbs({
  selectedPath,
  sources,
}: PanelBreadcrumbsProps) {
  const { t } = useTranslation(['app']);
  const trail = toBreadcrumbTrail(selectedPath, sources);
  if (trail === null) return null;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
      <Breadcrumbs aria-label={t('app:panel.breadcrumbs.label')}>
        <Typography color="text.primary" variant="body2">
          {trail.sourceName}
        </Typography>
        {trail.segments.map((segment, index) => {
          const isLast = index === trail.segments.length - 1;
          return (
            <Typography
              key={trail.segments.slice(0, index + 1).join('/')}
              color={isLast ? 'text.primary' : 'text.secondary'}
              variant="body2"
            >
              {segment}
            </Typography>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
