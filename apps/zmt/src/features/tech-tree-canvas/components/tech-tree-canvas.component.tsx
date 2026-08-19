import { TechTreePoint } from '@contracts';
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
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EntityFormShell } from '../../../shared/entity-form';
import {
  useAirTechTree,
  useTechnologyAdd,
  useTechnologyDelete,
  useTechnologyEdit,
} from '../hooks';
import { TechNode } from './tech-node.component';
import { TechnologyDeleteDialog } from './technology-delete-dialog.component';

import '@xyflow/react/dist/style.css';

const nodeTypes = { tech: TechNode };

// The one projection free placement needs off the flow instance. Typed
// structurally rather than as `ReactFlowInstance`, whose node generic defaults to
// react-flow's own `Node` — our narrower `TechFlowNode` does not satisfy it, and
// widening the ref would only be to name a type we never use.
interface FlowProjection {
  screenToFlowPosition: (point: TechTreePoint) => TechTreePoint;
}

// The tech-tree canvas: replaces the ZMT-41 placeholder for the `aircraft`
// feature. Renders the air research tree at the game's real geometry — nodes at
// their bound gridbox origin, `path` edges as solid connectors — with react-flow
// pan/zoom/fit. Auto-layout is OFF: positions are authored (ADR 026 decision 1).
// Fidelity (ZMT-44): each node loads its `GFX_<token>_medium` icon; the three node
// kinds render distinctly; the hidden `dependencies` AND-edges toggle on as a
// dashed overlay (off by default — the default view matches the game); clicking a
// node selects it.
// Mutation (ADR 028): a selected node opens the shared technology form for EDIT
// (ZMT-50) or for ADD-as-child (ZMT-51 path 1); right-clicking empty canvas opens
// it for a free-placed technology at the click (ZMT-51 path 2). Both add paths
// commit through the same atomic insert batch and reload the tree on save.
export function TechTreeCanvas() {
  const { t } = useTranslation(['feature.techTreeCanvas']);
  const {
    allTechnologyIds,
    dependencyEdges,
    edges,
    folder,
    nodes,
    reload,
    rows,
    sources,
    status,
  } = useAirTechTree();
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [showDependencies, setShowDependencies] = useState(false);
  // The flow instance, captured at init purely for `screenToFlowPosition`: a
  // right-click on the pane arrives in SCREEN pixels and free placement is
  // measured in FLOW pixels, the same space the nodes are laid out in.
  const flowRef = useRef<FlowProjection | null>(null);

  // The descriptor localizes its labels through the injected translate, the same
  // seam the ML content panel supplies; a new `t` on locale change re-projects.
  const translate = useCallback<TranslateFn>(
    (key) => (t as (key: string) => string)(key),
    [t],
  );
  const edit = useTechnologyEdit(sources, allTechnologyIds, translate);
  // The deleted node may be the selected one, so the selection is cleared with
  // the same callback that reloads the tree — a selection pointing at a removed
  // technology would leave Edit and Add-child armed against nothing.
  const del = useTechnologyDelete(
    useCallback(() => {
      setSelectedId(null);
      reload();
    }, [reload]),
  );
  const add = useTechnologyAdd({
    allTechnologyIds,
    folder,
    rows,
    sources,
    translate,
  });

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
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onNodeDoubleClick={(_, node) => {
            setSelectedId(node.id);
            edit.open(node.id);
          }}
          onPaneClick={() => setSelectedId(null)}
          // Free placement (ZMT-51 path 2). Right-click is the click position the
          // add needs; the context menu itself is a later ticket, the ACTION is
          // this one's.
          onPaneContextMenu={(event) => {
            event.preventDefault();
            const instance = flowRef.current;
            if (instance === null) return;
            add.openFree(
              instance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              }),
            );
          }}
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
            <Button
              disabled={selectedId === null || add.status === 'loading'}
              size="small"
              sx={{ bgcolor: 'background.paper', ml: 1 }}
              variant="outlined"
              onClick={() => {
                if (selectedId !== null) add.openChild(selectedId);
              }}
            >
              {t('feature.techTreeCanvas:addChild')}
            </Button>
            <Button
              color="error"
              disabled={selectedId === null || del.status === 'loading'}
              size="small"
              sx={{ bgcolor: 'background.paper', ml: 1 }}
              variant="outlined"
              onClick={() => {
                if (selectedId !== null) del.open(selectedId);
              }}
            >
              {t('feature.techTreeCanvas:delete')}
            </Button>
            {del.status !== 'idle' &&
              del.status !== 'loading' &&
              del.status !== 'deleting' && (
                <Typography color="text.secondary" variant="caption">
                  {t(`feature.techTreeCanvas:deleteStatus.${del.status}`)}
                </Typography>
              )}
            {edit.status !== 'idle' && edit.status !== 'loading' && (
              <Typography color="text.secondary" variant="caption">
                {t(`feature.techTreeCanvas:editStatus.${edit.status}`)}
              </Typography>
            )}
            {add.status !== 'idle' && add.status !== 'loading' && (
              <Typography color="text.secondary" variant="caption">
                {t(`feature.techTreeCanvas:addStatus.${add.status}`)}
              </Typography>
            )}
            <Typography color="text.secondary" component="p" variant="caption">
              {t('feature.techTreeCanvas:addFreeHint')}
            </Typography>
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
          onSaved={reload}
        />
      )}
      {/* The SAME shell and the SAME descriptor, projected in add mode (ADR 028
          decision 5). `reload` on save is what makes the new node appear — and,
          for a free-placed one, is the reload that proves it comes back at the
          cell it was written to. */}
      {add.model !== null && (
        <EntityFormShell
          model={add.model}
          onClose={add.close}
          onSaved={reload}
        />
      )}
      {/* Delete is confirmed against the SERVER-COMPUTED plan (ZMT-52): the
          tree count and the dangling-reference warning both come off the main
          side, which is the only place that can see the whole edge graph. */}
      {del.plan !== null && del.token !== null && (
        <TechnologyDeleteDialog
          busy={del.status === 'deleting'}
          plan={del.plan}
          token={del.token}
          onCancel={del.cancel}
          onConfirm={del.commit}
        />
      )}
    </Box>
  );
}
