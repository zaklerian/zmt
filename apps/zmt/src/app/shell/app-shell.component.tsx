import { OpenMod, ProjectedSource } from '@contracts';
import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { AppSettingsModal } from '../../features/app-settings';
import {
  FileTreeSelection,
  ModContent,
  NoFolderState,
} from '../../features/mod-content';
import { AppLayout } from '../layout';
import { ShellContextProvider, ShellContextValue } from './shell-context';

export function AppShell() {
  const [openMods, setOpenMods] = useState<readonly OpenMod[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<null | string>(null);
  const [activeModRootPath, setActiveModRootPath] = useState<null | string>(
    null,
  );
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [hideUnsupportedFiles, setHideUnsupportedFiles] = useState(false);
  const [hideVanilla, setHideVanilla] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.api.workspace
      .get()
      .then((workspace) => setOpenMods(workspace.openMods))
      .catch(() => setOpenMods([]));
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

  const hasSource = openMods.length > 0;

  const sources = useMemo<readonly ProjectedSource[]>(() => {
    const visible = hideVanilla
      ? openMods.filter((mod) => mod.permission !== 'readonly')
      : openMods;
    return visible.map((mod) => ({
      path: mod.path,
      permission: mod.permission,
    }));
  }, [hideVanilla, openMods]);

  const handleOpenFolder = async () => {
    try {
      const chosen = await window.api.fs.openFolderDialog();
      if (chosen === null) return;
      const current = await window.api.workspace.get();
      if (current.activeModId !== null) {
        await window.api.workspace.closeMod(current.activeModId);
      }
      await window.api.workspace.openMod(chosen);
      const workspace = await window.api.workspace.get();
      setOpenMods(workspace.openMods);
      setSelectedPath(null);
      setActiveModRootPath(null);
      if (location.pathname !== '/') {
        void navigate('/');
      }
    } catch (error) {
      console.error('Failed to open folder dialog', error);
    }
  };

  const handleSelect = (selection: FileTreeSelection) => {
    setSelectedPath(selection.path);
    if (selection.path !== null && selection.isModRoot) {
      setActiveModRootPath(selection.path);
      if (location.pathname !== '/mod/info') {
        void navigate('/mod/info');
      }
      return;
    }
    setActiveModRootPath(null);
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
      {selectedPath !== null && location.pathname === '/' && (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary" variant="body2">
            {selectedPath}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const shellValue = useMemo<ShellContextValue>(
    () => ({ activeModRootPath, selectedPath }),
    [activeModRootPath, selectedPath],
  );

  return (
    <ShellContextProvider value={shellValue}>
      <AppLayout
        content={content}
        drawerOpen={drawerOpen}
        hasSource={hasSource}
        sidebar={sidebar}
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
