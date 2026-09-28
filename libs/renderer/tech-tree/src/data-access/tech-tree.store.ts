import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus, pending } from '@zmt/renderer/core';
import { type Observable, tap } from 'rxjs';

import type { TechTreeEdge, TechTreeNode, TechTreeNodeView } from '../util';

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
      visibleEdges: computed<readonly TechTreeEdge[]>(() =>
        showDependencies() ? edges() : edges().filter((edge) => edge.kind === 'path'),
      ),
    }),
  ),
  withMethods((store) => {
    const load = rxMethod((source$: Observable<void>) =>
      source$.pipe(tap(() => pending('ZMT-A-5'))),
    );
    const reload = (): void => {
      load();
    };
    const select = (id: null | string): void => {
      patchState(store, { selectedId: id });
    };
    const setSearch = (query: string): void => {
      patchState(store, { search: query });
    };
    const setSelectedCategories = (categories: readonly string[]): void => {
      patchState(store, { selectedCategories: [...categories] });
    };
    const setShowDependencies = (show: boolean): void => {
      patchState(store, { showDependencies: show });
    };
    return { load, reload, select, setSearch, setSelectedCategories, setShowDependencies };
  }),
);
