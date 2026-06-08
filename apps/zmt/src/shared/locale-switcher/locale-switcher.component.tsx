import {
  Alert,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Locale, LOCALES, useLocale } from '../../i18n';
import { useAsyncCallback } from '../hooks';

const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  uk: 'Українська',
};

export function LocaleSwitcher() {
  const { t } = useTranslation('app');
  const { locale, setLocale } = useLocale();
  const change = useAsyncCallback(setLocale);
  const [error, setError] = useState<null | string>(null);

  const handleChange = (event: SelectChangeEvent<Locale>) => {
    setError(null);
    void change.execute(event.target.value).catch(() => {
      setError(t('footer.localeSwitcher.error'));
    });
  };

  return (
    <>
      <Select
        disabled={change.isPending}
        inputProps={{ 'aria-label': t('footer.localeSwitcher.label') }}
        size="small"
        sx={{ minWidth: 140 }}
        value={locale}
        onChange={handleChange}
      >
        {LOCALES.map((l) => (
          <MenuItem key={l} value={l}>
            {LOCALE_NATIVE_NAMES[l]}
          </MenuItem>
        ))}
      </Select>
      <Snackbar
        autoHideDuration={5000}
        open={error !== null}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
