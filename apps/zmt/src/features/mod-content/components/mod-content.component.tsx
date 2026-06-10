import { ProjectedSource } from '@contracts';
import { Box } from '@mui/material';

import { FileTreeSearch } from './file-tree-search.component';
import { FileTree, FileTreeSelection } from './file-tree.component';

interface ModContentProps {
  hideUnsupportedFiles: boolean;
  onSelect: (selection: FileTreeSelection) => void;
  selectedPath: null | string;
  sources: readonly ProjectedSource[];
}

export function ModContent({
  hideUnsupportedFiles,
  onSelect,
  selectedPath,
  sources,
}: ModContentProps) {
  const searchRoot =
    sources.find((s) => s.permission === 'editable')?.path ?? null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1 }}>
      <FileTreeSearch
        hideUnsupportedFiles={hideUnsupportedFiles}
        root={searchRoot}
        onSelect={(node) =>
          onSelect({
            isModRoot: false,
            path: node.path,
            support: node.support,
          })
        }
      />
      <FileTree
        hideUnsupportedFiles={hideUnsupportedFiles}
        selectedPath={selectedPath}
        sources={sources}
        onSelect={onSelect}
      />
    </Box>
  );
}
