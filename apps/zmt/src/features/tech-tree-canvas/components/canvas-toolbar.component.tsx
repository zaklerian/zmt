import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WriteTargetSettings } from '../../../shared/write-target';

interface CanvasToolbarProps {
  // The declared category vocabulary the filter offers (ZMT-35's index).
  readonly categories: readonly string[];
  onCategoriesChange: (next: readonly string[]) => void;
  onSearchChange: (next: string) => void;
  readonly search: string;
  readonly selectedCategories: readonly string[];
}

// The canvas toolbar (ZMT-54): a search box and a multi-select category filter.
// Both are renderer state over the ALREADY-FETCHED workspace-scoped set — no new
// read, no server-side filter (narrowing the list is a renderer concern, ADR 024
// decision 4). Fully controlled (A-REACT-1): this renders and reports, it holds no
// state and decides nothing about emphasis — the composition rule lives in
// `canvas-node-emphasis.util.ts`.
export function CanvasToolbar({
  categories,
  onCategoriesChange,
  onSearchChange,
  search,
  selectedCategories,
}: CanvasToolbarProps) {
  const { t } = useTranslation(['app', 'feature.techTreeCanvas']);
  // The ONE piece of state this component owns, and it is presentational: whether
  // the save-target dialog is mounted. The targets themselves live in the
  // preference the dialog writes, not here (req 10, ADR 029 decision 3 — the choice
  // is made in settings, never prompted at write time).
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
        display: 'flex',
        gap: 1,
        p: 0.5,
      }}
    >
      <TextField
        label={t('feature.techTreeCanvas:toolbar.search')}
        size="small"
        sx={{ minWidth: 220 }}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="canvas-toolbar-categories-label">
          {t('feature.techTreeCanvas:toolbar.categories')}
        </InputLabel>
        <Select
          label={t('feature.techTreeCanvas:toolbar.categories')}
          labelId="canvas-toolbar-categories-label"
          multiple
          renderValue={(selected) => selected.join(', ')}
          value={[...selectedCategories]}
          onChange={(event) => {
            const { value } = event.target;
            onCategoriesChange(
              typeof value === 'string' ? value.split(',') : value,
            );
          }}
        >
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              <Checkbox
                checked={selectedCategories.includes(category)}
                size="small"
              />
              <ListItemText primary={category} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button size="small" onClick={() => setSettingsOpen(true)}>
        {t('app:saveTargets.title')}
      </Button>
      {settingsOpen && (
        <WriteTargetSettings onClose={() => setSettingsOpen(false)} />
      )}
    </Box>
  );
}
