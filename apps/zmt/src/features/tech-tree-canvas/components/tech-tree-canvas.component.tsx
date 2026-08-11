import { Box, Typography } from '@mui/material';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAirTechTree } from '../hooks';
import { TechNode } from './tech-node.component';

import '@xyflow/react/dist/style.css';

const nodeTypes = { tech: TechNode };

// The tech-tree canvas: replaces the ZMT-41 placeholder for the `aircraft`
// feature. Renders the air research tree at the game's real geometry — nodes at
// their bound gridbox origin, `path` edges as solid connectors — with react-flow
// pan/zoom/fit. Auto-layout is OFF: positions are authored (ADR 026 decision 1),
// so nodes are placed, never laid out. Read-only — nothing draggable, connectable,
// or selectable this ticket (ZMT-44).
export function TechTreeCanvas() {
  const { t } = useTranslation(['feature.techTreeCanvas']);
  const { edges, nodes, status } = useAirTechTree();

  // react-flow's props are mutable arrays; our hook holds readonly ones (R-TS-5).
  // Copy at the boundary, memoised on the stable fetched references so the canvas
  // is not re-seeded every render.
  const flowNodes = useMemo(() => [...nodes], [nodes]);
  const flowEdges = useMemo(() => [...edges], [edges]);

  const message = useMemo<null | string>(() => {
    if (status === 'loading') return t('feature.techTreeCanvas:loading');
    if (status === 'error') return t('feature.techTreeCanvas:error');
    if (nodes.length === 0) return t('feature.techTreeCanvas:empty');
    return null;
  }, [nodes.length, status, t]);

  if (message !== null) {
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
          {message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <ReactFlowProvider>
        <ReactFlow
          edges={flowEdges}
          elementsSelectable={false}
          fitView
          nodeTypes={nodeTypes}
          nodes={flowNodes}
          nodesConnectable={false}
          nodesDraggable={false}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
}
