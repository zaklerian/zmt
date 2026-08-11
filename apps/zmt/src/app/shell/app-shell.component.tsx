import {
  FEATURE_IDS,
  FeatureId,
  FileSupport,
  IncludedMod,
  ProjectedSource,
} from '@contracts';
import { Box } from '@mui/material';
import { recognizerRegistry } from '@r-core';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { AppSettingsModal } from '../../features/app-settings';
import {
  FeatureNavList,
  FeatureTreePlaceholder,
  NavModeToggle,
  PANEL_MODES,
  PanelMode,
  useEnabledFeatures,
} from '../../features/feature-nav';
import {
  ContentModeToggle,
  FileTreeSelection,
  ModContent,
  NoFolderState,
} from '../../features/mod-content';
import { modInfoEditService } from '../../features/mod-info-edit';
import { TechTreeCanvas } from '../../features/tech-tree-canvas';
import { AppLayout } from '../layout';
import { ShellContextProvider, ShellContextValue } from './shell-context';
import { useContentViewMode } from './use-content-view-mode.hook';
import { useEditGuard } from './use-edit-guard.hook';

export function AppShell() {
  const [includedMods, setIncludedMods] = useState<readonly IncludedMod[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<null | string>(null);
  const [selectedSupport, setSelectedSupport] = useState<FileSupport | null>(
    null,
  );
  const { setViewMode, viewMode } = useContentViewMode(selectedPath);
  const {
    confirmLeaveIfDirty,
    consumeLeaveConfirmed,
    registerEditGuard,
    signalLeaveConfirmed,
  } = useEditGuard();
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [hideUnsupportedFiles, setHideUnsupportedFiles] = useState(false);
  const [hideVanilla, setHideVanilla] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(PANEL_MODES.file);
  const [activeFeatureId, setActiveFeatureId] = useState<FeatureId | null>(
    null,
  );
  const { features: enabledFeatures, refetch: refetchFeatures } =
    useEnabledFeatures();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.api.workspace
      .get()
      .then((workspace) => setIncludedMods(workspace.includedMods))
      .catch(() => setIncludedMods([]));
  }, []);

  useEffect(() => {
    window.api.preferences
      .get('hideUnsupportedFiles')
      .then((value) => setHideUnsupportedFiles(value ?? false))
      .catch(() => setHideUnsupportedFiles(false));
  }, []);

  useEffect(() => {
    window.api.preferences
      .get('hideVanilla')
      .then((value) => setHideVanilla(value ?? false))
      .catch(() => setHideVanilla(false));
  }, []);

  const hasSource = includedMods.length > 0;

  // Nav mode is only reachable while a feature is enabled. Deriving the effective
  // mode (rather than storing it) means disabling the last feature in settings
  // falls back to file mode without a mode-reset effect.
  const inNavMode = panelMode === PANEL_MODES.nav && enabledFeatures.length > 0;
  const activeFeature =
    enabledFeatures.find((f) => f.featureId === activeFeatureId) ?? null;

  const activeMod = useMemo<IncludedMod | null>(() => {
    if (selectedPath === null) return null;
    return (
      includedMods.find(
        (mod) =>
          mod.permission === 'editable' && containsPath(mod.path, selectedPath),
      ) ?? null
    );
  }, [includedMods, selectedPath]);
  const activeModId = activeMod?.id ?? null;
  const activeModRootPath = activeMod?.path ?? null;

  const sources = useMemo<readonly ProjectedSource[]>(() => {
    const visible = hideVanilla
      ? includedMods.filter((mod) => mod.permission !== 'readonly')
      : includedMods;
    return visible.map((mod) => ({
      path: mod.path,
      permission: mod.permission,
    }));
  }, [hideVanilla, includedMods]);

  const handleOpenFolder = async () => {
    try {
      const chosen = await window.api.fs.openFolderDialog();
      if (chosen === null) return;
      await window.api.workspace.addMod(chosen);
      const workspace = await window.api.workspace.get();
      setIncludedMods(workspace.includedMods);
      setSelectedPath(null);
      setSelectedSupport(null);
      if (location.pathname !== '/') {
        void navigate('/');
      }
    } catch (error) {
      console.error('Failed to open folder dialog', error);
    }
  };

  const handleSelect = (selection: FileTreeSelection) => {
    void (async () => {
      // Gate the swap itself: the buffer dies at setSelectedPath-driven remount,
      // which useBlocker cannot prevent (it blocks navigation, not state). Both
      // the intra-route content swap and the route-changing branches pass here.
      if (!(await confirmLeaveIfDirty())) return;
      setSelectedPath(selection.path);
      setSelectedSupport(selection.support);
      if (selection.path !== null && selection.isModRoot) {
        if (location.pathname !== '/mod/info') {
          // Consent already obtained above; suppress the still-mounted editor's
          // useBlocker for this one consent-driven transition (ZMT-E8.1).
          signalLeaveConfirmed();
          void navigate('/mod/info');
        }
        return;
      }
      if (location.pathname !== '/') {
        signalLeaveConfirmed();
        void navigate('/');
      }
    })();
  };

  const sidebar = !hasSource ? null : inNavMode ? (
    <FeatureNavList
      activeFeatureId={activeFeatureId}
      features={enabledFeatures}
      onSelect={setActiveFeatureId}
    />
  ) : (
    <ModContent
      hideUnsupportedFiles={hideUnsupportedFiles}
      selectedPath={selectedPath}
      sources={sources}
      onSelect={handleSelect}
    />
  );

  const content = !hasSource ? (
    <NoFolderState onOpenFolder={handleOpenFolder} />
  ) : inNavMode ? (
    activeFeature?.featureId === FEATURE_IDS.aircraft ? (
      <TechTreeCanvas />
    ) : (
      <FeatureTreePlaceholder feature={activeFeature} />
    )
  ) : (
    <Box sx={{ height: '100%' }}>
      <Outlet />
    </Box>
  );

  const panelModeToggle =
    enabledFeatures.length > 0 ? (
      <NavModeToggle mode={panelMode} onChange={setPanelMode} />
    ) : null;

  const isEntityFile =
    selectedPath !== null &&
    recognizerRegistry.recognize(selectedPath) !== null;
  const isModFile =
    selectedPath !== null && modInfoEditService.isDescriptorPath(selectedPath);

  const shellValue = useMemo<ShellContextValue>(
    () => ({
      activeModId,
      activeModRootPath,
      confirmLeaveIfDirty,
      consumeLeaveConfirmed,
      registerEditGuard,
      selectedPath,
      selectedSupport,
      setViewMode,
      signalLeaveConfirmed,
      viewMode,
    }),
    [
      activeModId,
      activeModRootPath,
      confirmLeaveIfDirty,
      consumeLeaveConfirmed,
      registerEditGuard,
      selectedPath,
      selectedSupport,
      setViewMode,
      signalLeaveConfirmed,
      viewMode,
    ],
  );

  return (
    <ShellContextProvider value={shellValue}>
      <AppLayout
        content={content}
        drawerOpen={drawerOpen}
        hasSource={hasSource}
        panelModeToggle={panelModeToggle}
        panelToolbarRight={
          isEntityFile || isModFile ? (
            <ContentModeToggle
              mode={viewMode}
              structuredView={isModFile ? 'form' : 'table'}
              onChange={setViewMode}
            />
          ) : null
        }
        selectedPath={selectedPath}
        sidebar={sidebar}
        sources={sources}
        onOpenAppSettings={() => setAppSettingsOpen(true)}
        onOpenFolder={handleOpenFolder}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />
      <AppSettingsModal
        hideUnsupportedFiles={hideUnsupportedFiles}
        hideVanilla={hideVanilla}
        open={appSettingsOpen}
        onClose={() => {
          setAppSettingsOpen(false);
          refetchFeatures();
          window.api.preferences
            .get('hideUnsupportedFiles')
            .then((value) => setHideUnsupportedFiles(value ?? false))
            .catch(() => undefined);
          window.api.preferences
            .get('hideVanilla')
            .then((value) => setHideVanilla(value ?? false))
            .catch(() => undefined);
        }}
      />
    </ShellContextProvider>
  );
}

function containsPath(root: string, target: string): boolean {
  if (target === root) return true;
  if (!target.startsWith(root)) return false;
  const rest = target.slice(root.length);
  return rest.startsWith('/') || rest.startsWith('\\');
}
