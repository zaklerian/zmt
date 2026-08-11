import type { NodeProps } from '@xyflow/react';

import { Box } from '@mui/material';
import { Handle, Position } from '@xyflow/react';

import { TechFlowNode } from '../build-air-tree-flow.util';

// Minimal node: a box labelled with the technology token (a raw id, not a
// localizable string — R-CODE-5/R-REACT-3), its `nodeKind` shown only by border
// style. `wide` = solid emphasis, `simple` = plain, `sub` = dashed. No icon, no
// node-kind visual fidelity, no selection (all ZMT-44). Handles are the edge
// anchors react-flow routes `path` connectors through; hidden, since the user
// draws nothing.
export function TechNode({ data }: NodeProps<TechFlowNode>) {
  const borderStyle = data.nodeKind === 'sub' ? 'dashed' : 'solid';
  const borderWidth = data.nodeKind === 'wide' ? 2 : 1;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: borderWidth,
        borderColor: 'divider',
        borderRadius: 1,
        borderStyle,
        color: 'text.primary',
        fontSize: 12,
        maxWidth: 140,
        overflow: 'hidden',
        px: 1,
        py: 0.5,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <Handle
        isConnectable={false}
        position={Position.Top}
        style={{ opacity: 0 }}
        type="target"
      />
      {data.token}
      <Handle
        isConnectable={false}
        position={Position.Bottom}
        style={{ opacity: 0 }}
        type="source"
      />
    </Box>
  );
}
