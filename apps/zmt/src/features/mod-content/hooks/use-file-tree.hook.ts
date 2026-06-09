import { FsNode, IpcError, isIpcError } from '@contracts';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { modContentService } from '../services/mod-content.service';

type FileTreeAction =
  | { error: IpcError; fetchId: number; type: 'root-failed' }
  | { fetchId: number; nodes: readonly FsNode[]; type: 'root-loaded' }
  | { fetchId: number; root: null | string; type: 'reset' }
  | { nodes: readonly FsNode[]; path: string; type: 'children-loaded' };

interface FileTreeState {
  readonly childrenByPath: ReadonlyMap<string, readonly FsNode[]>;
  readonly error: IpcError | null;
  readonly fetchId: number;
  readonly loadingRoot: boolean;
  readonly root: null | string;
}

function reducer(state: FileTreeState, action: FileTreeAction): FileTreeState {
  switch (action.type) {
    case 'children-loaded': {
      if (state.childrenByPath.has(action.path)) return state;
      const next = new Map(state.childrenByPath);
      next.set(action.path, action.nodes);
      return { ...state, childrenByPath: next };
    }
    case 'reset':
      return {
        childrenByPath: new Map(),
        error: null,
        fetchId: action.fetchId,
        loadingRoot: action.root !== null,
        root: action.root,
      };
    case 'root-failed':
      if (action.fetchId !== state.fetchId) return state;
      return { ...state, error: action.error, loadingRoot: false };
    case 'root-loaded':
      if (action.fetchId !== state.fetchId) return state;
      return {
        ...state,
        childrenByPath: new Map([[state.root ?? '', action.nodes]]),
        loadingRoot: false,
      };
  }
}

const initialState: FileTreeState = {
  childrenByPath: new Map(),
  error: null,
  fetchId: 0,
  loadingRoot: false,
  root: null,
};

interface UseFileTreeOptions {
  readonly hideUnsupportedFiles: boolean;
  readonly root: null | string;
}

interface UseFileTreeResult {
  readonly childrenByPath: ReadonlyMap<string, readonly FsNode[]>;
  readonly error: IpcError | null;
  readonly loadChildren: (path: string) => void;
  readonly loadingRoot: boolean;
  readonly rootChildren: readonly FsNode[];
}

export function useFileTree({
  hideUnsupportedFiles,
  root,
}: UseFileTreeOptions): UseFileTreeResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const fetchCounterRef = useRef(0);

  useEffect(() => {
    const fetchId = ++fetchCounterRef.current;
    dispatch({ fetchId, root, type: 'reset' });

    if (root === null) return;

    modContentService
      .listDirectory(root, { hideUnsupportedFiles })
      .then((nodes) => dispatch({ fetchId, nodes, type: 'root-loaded' }))
      .catch((error: unknown) => {
        const ipcError: IpcError = isIpcError(error)
          ? error
          : { code: 500, message: String(error) };
        dispatch({ error: ipcError, fetchId, type: 'root-failed' });
      });
  }, [hideUnsupportedFiles, root]);

  const loadChildren = useCallback(
    (path: string) => {
      if (state.childrenByPath.has(path)) return;
      modContentService
        .listDirectory(path, { hideUnsupportedFiles })
        .then((nodes) => dispatch({ nodes, path, type: 'children-loaded' }))
        .catch(() => {
          dispatch({ nodes: [], path, type: 'children-loaded' });
        });
    },
    [hideUnsupportedFiles, state.childrenByPath],
  );

  return {
    childrenByPath: state.childrenByPath,
    error: state.error,
    loadChildren,
    loadingRoot: state.loadingRoot,
    rootChildren: state.childrenByPath.get(state.root ?? '') ?? [],
  };
}
