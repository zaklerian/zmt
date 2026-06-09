import { Box } from '@mui/material';

import { FileTreeSearch } from './file-tree-search.component';
import { FileTree, FileTreeSelection } from './file-tree.component';

interface ModContentProps {
  hideUnsupportedFiles: boolean;
  onSelect: (selection: FileTreeSelection) => void;
  root: null | string;
  selectedPath: null | string;
}

export function ModContent({
  hideUnsupportedFiles,
  onSelect,
  root,
  selectedPath,
}: ModContentProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1 }}>
      <FileTreeSearch
        hideUnsupportedFiles={hideUnsupportedFiles}
        root={root}
        onSelect={(path) => onSelect({ isModRoot: false, path })}
      />
      <FileTree
        hideUnsupportedFiles={hideUnsupportedFiles}
        root={root}
        selectedPath={selectedPath}
        onSelect={onSelect}
      />
    </Box>
  );
}
