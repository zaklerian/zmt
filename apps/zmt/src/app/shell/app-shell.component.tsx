import { Workspace } from '@contracts';
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
  const [currentRoot, setCurrentRoot] = useState<null | string>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<null | string>(null);
  const [activeModRootPath, setActiveModRootPath] = useState<null | string>(
    null,
  );
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.api.workspace
      .get()
      .then((workspace) => setCurrentRoot(activeRoot(workspace)))
      .catch(() => setCurrentRoot(null));
  }, []);

  const handleOpenFolder = async () => {
    try {
      const chosen = await window.api.fs.openFolderDialog();
      if (chosen === null) return;
      const current = await window.api.workspace.get();
      if (current.activeModId !== null) {
        await window.api.workspace.closeMod(current.activeModId);
      }
      const workspace = await window.api.workspace.openMod(chosen);
      setCurrentRoot(activeRoot(workspace));
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

  const sidebar =
    currentRoot === null ? null : (
      <ModContent
        root={currentRoot}
        selectedPath={selectedPath}
        onSelect={handleSelect}
      />
    );

  const content =
    currentRoot === null ? (
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
    () => ({ activeModRootPath, currentRoot, selectedPath }),
    [currentRoot, selectedPath, activeModRootPath],
  );

  return (
    <ShellContextProvider value={shellValue}>
      <AppLayout
        content={content}
        currentRoot={currentRoot}
        drawerOpen={drawerOpen}
        sidebar={sidebar}
        onOpenAppSettings={() => setAppSettingsOpen(true)}
        onOpenFolder={handleOpenFolder}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />
      <AppSettingsModal
        open={appSettingsOpen}
        onClose={() => setAppSettingsOpen(false)}
      />
    </ShellContextProvider>
  );
}

function activeRoot(workspace: Workspace): null | string {
  const active = workspace.openMods.find(
    (mod) => mod.id === workspace.activeModId,
  );
  return active ? active.path : null;
}
