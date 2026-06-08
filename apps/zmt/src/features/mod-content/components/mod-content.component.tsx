import { Box } from '@mui/material';

import { FileTreeSearch } from './file-tree-search.component';
import { FileTree, FileTreeSelection } from './file-tree.component';

interface ModContentProps {
  onSelect: (selection: FileTreeSelection) => void;
  root: null | string;
  selectedPath: null | string;
}

export function ModContent({ onSelect, root, selectedPath }: ModContentProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1 }}>
      <FileTreeSearch
        root={root}
        onSelect={(path) => onSelect({ isModRoot: false, path })}
      />
      <FileTree root={root} selectedPath={selectedPath} onSelect={onSelect} />
    </Box>
  );
}
