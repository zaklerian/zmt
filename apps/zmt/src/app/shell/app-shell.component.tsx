import { FileSupport, IncludedMod, ProjectedSource } from '@contracts';
import { Box } from '@mui/material';
import { recognizerRegistry } from '@r-core';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { AppSettingsModal } from '../../features/app-settings';
import {
  ContentModeToggle,
  FileTreeSelection,
  ModContent,
  NoFolderState,
} from '../../features/mod-content';
import { AppLayout } from '../layout';
import { ShellContextProvider, ShellContextValue } from './shell-context';
import { useContentViewMode } from './use-content-view-mode.hook';

export function AppShell() {
  const [includedMods, setIncludedMods] = useState<readonly IncludedMod[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<null | string>(null);
  const [selectedSupport, setSelectedSupport] = useState<FileSupport | null>(
    null,
  );
  const { setViewMode, viewMode } = useContentViewMode(selectedPath);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [hideUnsupportedFiles, setHideUnsupportedFiles] = useState(false);
  const [hideVanilla, setHideVanilla] = useState(false);

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

  const activeModRootPath = useMemo<null | string>(() => {
    if (selectedPath === null) return null;
    const containing = includedMods.find(
      (mod) =>
        mod.permission === 'editable' && containsPath(mod.path, selectedPath),
    );
    return containing ? containing.path : null;
  }, [includedMods, selectedPath]);

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
    setSelectedPath(selection.path);
    setSelectedSupport(selection.support);
    if (selection.path !== null && selection.isModRoot) {
      if (location.pathname !== '/mod/info') {
        void navigate('/mod/info');
      }
      return;
    }
    if (location.pathname !== '/') {
      void navigate('/');
    }
  };

  const sidebar = !hasSource ? null : (
    <ModContent
      hideUnsupportedFiles={hideUnsupportedFiles}
      selectedPath={selectedPath}
      sources={sources}
      onSelect={handleSelect}
    />
  );

  const content = !hasSource ? (
    <NoFolderState onOpenFolder={handleOpenFolder} />
  ) : (
    <Box sx={{ height: '100%' }}>
      <Outlet />
    </Box>
  );

  const isEntityFile =
    selectedPath !== null &&
    recognizerRegistry.recognize(selectedPath) !== null;

  const shellValue = useMemo<ShellContextValue>(
    () => ({
      activeModRootPath,
      selectedPath,
      selectedSupport,
      setViewMode,
      viewMode,
    }),
    [activeModRootPath, selectedPath, selectedSupport, setViewMode, viewMode],
  );

  return (
    <ShellContextProvider value={shellValue}>
      <AppLayout
        content={content}
        drawerOpen={drawerOpen}
        hasSource={hasSource}
        panelToolbarRight={
          isEntityFile ? (
            <ContentModeToggle mode={viewMode} onChange={setViewMode} />
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
