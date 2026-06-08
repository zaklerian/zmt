import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import {
  FileTreeSelection,
  ModContent,
  NoFolderState,
} from '../../features/mod-content';
import { PluginConfigModal } from '../../features/plugin-config';
import { AppLayout } from '../layout';
import { ShellContextProvider, ShellContextValue } from './shell-context';

export function AppShell() {
  const [currentRoot, setCurrentRoot] = useState<null | string>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<null | string>(null);
  const [activeModRootPath, setActiveModRootPath] = useState<null | string>(
    null,
  );
  const [pluginConfigOpen, setPluginConfigOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.api.fs
      .getCurrentRoot()
      .then(setCurrentRoot)
      .catch(() => setCurrentRoot(null));
  }, []);

  const handleOpenFolder = async () => {
    try {
      const chosen = await window.api.fs.openFolderDialog();
      if (chosen !== null) {
        setCurrentRoot(chosen);
        setSelectedPath(null);
        setActiveModRootPath(null);
        if (location.pathname !== '/') {
          void navigate('/');
        }
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
        onOpenFolder={handleOpenFolder}
        onOpenPluginConfig={() => setPluginConfigOpen(true)}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />
      <PluginConfigModal
        open={pluginConfigOpen}
        onClose={() => setPluginConfigOpen(false)}
      />
    </ShellContextProvider>
  );
}
