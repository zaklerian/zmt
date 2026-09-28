import type { TechTreeEdge, TechTreeNode, TechTreeNodeView } from '@zmt/renderer/tech-tree/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { type Observable, tap } from 'rxjs';

import { toNodeView } from './node-emphasis.util';

export interface TechTreeState {
  readonly categories: readonly string[];
  readonly edges: readonly TechTreeEdge[];
  readonly names: Readonly<Record<string, string>>;
  readonly nodes: readonly TechTreeNode[];
  readonly search: string;
  readonly selectedCategories: readonly string[];
  readonly selectedId: null | string;
  readonly showDependencies: boolean;
  readonly status: AsyncStatus;
}

export const AIR_TECHS_FOLDER = 'air_techs_folder';

const INITIAL_STATE: TechTreeState = {
  categories: [],
  edges: [],
  names: {},
  nodes: [],
  search: '',
  selectedCategories: [],
  selectedId: null,
  showDependencies: false,
  status: ASYNC_IDLE,
};

export const TechTreeStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(
    ({
      edges,
      names,
      nodes,
      search,
      selectedCategories,
      selectedId,
      showDependencies,
      status,
    }) => ({
      isEmpty: computed(() => status().kind === 'success' && nodes().length === 0),
      nodeViews: computed<readonly TechTreeNodeView[]>(() => {
        const context = {
          names: names(),
          search: search(),
          selectedCategories: new Set(selectedCategories()),
          selectedId: selectedId(),
        };
        return nodes().map((node) => toNodeView(node, context));
      }),
      selectedNode: computed<TechTreeNode | null>(
        () => nodes().find((node) => node.id === selectedId()) ?? null,
      ),
      visibleEdges: computed<readonly TechTreeEdge[]>(() =>
        showDependencies() ? edges() : edges().filter((edge) => edge.kind === 'path'),
      ),
    }),
  ),
  withMethods(() => {
    const reload: () => void = () => pending('ZMT-A-5');
    const select: (id: null | string) => void = () => pending('ZMT-A-5');
    const setSearch: (query: string) => void = () => pending('ZMT-A-5');
    const setSelectedCategories: (categories: readonly string[]) => void = () => pending('ZMT-A-5');
    const setShowDependencies: (show: boolean) => void = () => pending('ZMT-A-5');
    return {
      load: rxMethod((source$: Observable<void>) => source$.pipe(tap(() => pending('ZMT-A-5')))),
      reload,
      select,
      setSearch,
      setSelectedCategories,
      setShowDependencies,
    };
  }),
);
