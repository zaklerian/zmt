import { useState } from 'react';

import { ViewMode } from './shell-context';

interface UseContentViewModeResult {
  setViewMode: (mode: ViewMode) => void;
  viewMode: ViewMode;
}

// Mode is session-only: it resets to the natural view (table) whenever the
// selected file changes, so reselecting an entity file returns to its table.
// The reset adjusts state during render (the React-recommended alternative to
// an effect) so it lands before the child dispatch reads the mode.
export function useContentViewMode(
  selectedPath: null | string,
): UseContentViewModeResult {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [lastPath, setLastPath] = useState(selectedPath);

  if (selectedPath !== lastPath) {
    setLastPath(selectedPath);
    setViewMode('table');
  }

  return { setViewMode, viewMode };
}
