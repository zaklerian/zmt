import type { NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';

import { Box } from '@mui/material';
import { Handle, Position } from '@xyflow/react';

import { TechFlowNode } from '../build-air-tree-flow.util';
import { useNodeIcon } from '../hooks';
import { nodeIconSprite } from '../node-icon-sprite.util';

// Per-kind icon edge, in px. Wide is the game's larger equipment box (icon + label
// side by side); simple is the small square node (icon over label); sub is the
// minimal attached chip. This is the game's own wide-vs-simple distinction (ADR 026
// D3): the equipment techs render in a wide box, the small nodes in a square.
const ICON_SIZE = { simple: 42, sub: 22, wide: 38 } as const;

// One node, three kinds, driven by `data.nodeKind`. The icon is the tech's own
// `GFX_<token>_medium` (Step 1 grounding — same source for every kind); on the two
// clean negatives or while loading it falls back to a framed placeholder so the
// node still renders, labeled, never blank and never a crash. `selected` (from
// react-flow's controlled model) drives a highlight ring — read-only this ticket,
// no mutation. Handles are the hidden edge anchors react-flow routes connectors
// through; the user draws nothing.
export function TechNode({ data, selected }: NodeProps<TechFlowNode>) {
  const icon = useNodeIcon(nodeIconSprite(data.token));
  const size = ICON_SIZE[data.nodeKind];

  const iconEl =
    icon.status === 'ok' ? (
      <Box
        alt=""
        component="img"
        data-testid="tech-node-icon"
        src={icon.dataUrl}
        sx={{
          display: 'block',
          height: size,
          objectFit: 'contain',
          width: size,
        }}
      />
    ) : (
      <Box
        data-testid="tech-node-icon-fallback"
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 0.5,
          flexShrink: 0,
          height: size,
          width: size,
        }}
      />
    );

  return (
    <NodeFrame nodeKind={data.nodeKind} selected={selected}>
      <Handle
        isConnectable={false}
        position={Position.Top}
        style={{ opacity: 0 }}
        type="target"
      />
      {iconEl}
      <Box
        sx={{
          fontSize: data.nodeKind === 'sub' ? 10 : 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.token}
      </Box>
      <Handle
        isConnectable={false}
        position={Position.Bottom}
        style={{ opacity: 0 }}
        type="source"
      />
    </NodeFrame>
  );
}

// The kind-specific box: wide/sub lay icon and label in a row; simple stacks them
// in a small square column. `selected` swaps the border to the primary accent with
// a soft ring, the read-only selection highlight.
function NodeFrame({
  children,
  nodeKind,
  selected,
}: {
  children: ReactNode;
  nodeKind: TechFlowNode['data']['nodeKind'];
  selected: boolean;
}) {
  const isSimple = nodeKind === 'simple';
  return (
    <Box
      data-node-kind={nodeKind}
      data-selected={selected ? 'true' : 'false'}
      data-testid="tech-node"
      sx={{
        alignItems: 'center',
        bgcolor: 'background.paper',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        borderStyle: nodeKind === 'sub' ? 'dashed' : 'solid',
        boxShadow: selected ? 3 : 0,
        color: 'text.primary',
        display: 'flex',
        flexDirection: isSimple ? 'column' : 'row',
        gap: isSimple ? 0.25 : 0.75,
        justifyContent: 'center',
        maxWidth: nodeKind === 'wide' ? 200 : undefined,
        px: nodeKind === 'sub' ? 0.5 : 1,
        py: 0.5,
        textAlign: 'center',
        width: isSimple ? 72 : undefined,
      }}
    >
      {children}
    </Box>
  );
}
