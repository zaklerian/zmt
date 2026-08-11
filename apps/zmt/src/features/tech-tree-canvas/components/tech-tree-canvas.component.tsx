import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAirTechTree } from '../hooks';
import { TechNode } from './tech-node.component';

import '@xyflow/react/dist/style.css';

const nodeTypes = { tech: TechNode };

// The tech-tree canvas: replaces the ZMT-41 placeholder for the `aircraft`
// feature. Renders the air research tree at the game's real geometry — nodes at
// their bound gridbox origin, `path` edges as solid connectors — with react-flow
// pan/zoom/fit. Auto-layout is OFF: positions are authored (ADR 026 decision 1).
// Fidelity (ZMT-44): each node loads its `GFX_<token>_medium` icon; the three node
// kinds render distinctly; the hidden `dependencies` AND-edges toggle on as a
// dashed overlay (off by default — the default view matches the game); clicking a
// node selects it (highlight only — read-only, no mutation this ticket).
export function TechTreeCanvas() {
  const { t } = useTranslation(['feature.techTreeCanvas']);
  const { dependencyEdges, edges, nodes, status } = useAirTechTree();
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  // react-flow's props are mutable arrays; our hook holds readonly ones (R-TS-5).
  // Copy at the boundary. Selection is parent-owned (ADR 026 D2, no store): the
  // `selected` flag is mapped onto the controlled nodes, so a click re-seeds only
  // the selection, and the dependency overlay is concatenated only when toggled on.
  const flowNodes = useMemo(
    () => nodes.map((node) => ({ ...node, selected: node.id === selectedId })),
    [nodes, selectedId],
  );
  const flowEdges = useMemo(
    () => (showDependencies ? [...edges, ...dependencyEdges] : [...edges]),
    [dependencyEdges, edges, showDependencies],
  );

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
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
        >
          <Background />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <FormControlLabel
              control={
                <Switch
                  checked={showDependencies}
                  size="small"
                  onChange={(event) =>
                    setShowDependencies(event.target.checked)
                  }
                />
              }
              label={
                <Typography variant="caption">
                  {t('feature.techTreeCanvas:dependenciesToggle')}
                </Typography>
              }
              sx={{ bgcolor: 'background.paper', borderRadius: 1, m: 0, pr: 1 }}
            />
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
}
