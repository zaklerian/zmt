import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { TranslateFn } from '@r-core';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EntityFormShell } from '../../../shared/entity-form';
import { useAirTechTree, useTechnologyEdit } from '../hooks';
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
  const { allTechnologyIds, dependencyEdges, edges, nodes, sources, status } =
    useAirTechTree();
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  // The descriptor localizes its labels through the injected translate, the same
  // seam the ML content panel supplies; a new `t` on locale change re-projects.
  const translate = useCallback<TranslateFn>(
    (key) => (t as (key: string) => string)(key),
    [t],
  );
  const edit = useTechnologyEdit(sources, allTechnologyIds, translate);

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
          onNodeDoubleClick={(_, node) => {
            setSelectedId(node.id);
            edit.open(node.id);
          }}
          onPaneClick={() => setSelectedId(null)}
        >
          <Background />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            <Button
              disabled={selectedId === null || edit.status === 'loading'}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
              variant="outlined"
              onClick={() => {
                if (selectedId !== null) edit.open(selectedId);
              }}
            >
              {t('feature.techTreeCanvas:edit')}
            </Button>
            {edit.status !== 'idle' && edit.status !== 'loading' && (
              <Typography color="text.secondary" variant="caption">
                {t(`feature.techTreeCanvas:editStatus.${edit.status}`)}
              </Typography>
            )}
          </Panel>
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
      {/* The ML form shell (ADR 018), presented as a modal over the canvas —
          reused wholesale, not rebuilt (ADR 028 decision 1). `onClose` is what
          puts it in dialog chrome. */}
      {edit.model !== null && (
        <EntityFormShell
          model={edit.model}
          onClose={edit.close}
          onSaved={edit.close}
        />
      )}
    </Box>
  );
}
