import { FsNode } from '@contracts';
import { Autocomplete, TextField } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFileSearch } from '../hooks';

interface FileTreeSearchProps {
  hideUnsupportedFiles: boolean;
  onSelect: (node: FsNode) => void;
  root: null | string;
}

export function FileTreeSearch({
  hideUnsupportedFiles,
  onSelect,
  root,
}: FileTreeSearchProps) {
  const { t } = useTranslation(['feature.modContent']);
  const [inputValue, setInputValue] = useState('');
  const { loading, results } = useFileSearch({
    hideUnsupportedFiles,
    query: inputValue,
    root,
  });

  const handleChange = (
    _event: null | React.SyntheticEvent,
    value: FsNode | null,
  ) => {
    if (value === null) return;
    onSelect(value);
    setInputValue('');
  };

  return (
    <Autocomplete<FsNode, false, false, false>
      disabled={root === null}
      filterOptions={(options) => options}
      fullWidth
      getOptionLabel={(option) => option.name}
      inputValue={inputValue}
      isOptionEqualToValue={(a, b) => a.path === b.path}
      loading={loading}
      options={[...results]}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={
            root === null
              ? t('feature.modContent:search.placeholder.noRoot')
              : t('feature.modContent:search.placeholder.ready')
          }
          variant="outlined"
        />
      )}
      size="small"
      value={null}
      onChange={handleChange}
      onInputChange={(_event, value) => setInputValue(value)}
    />
  );
}
