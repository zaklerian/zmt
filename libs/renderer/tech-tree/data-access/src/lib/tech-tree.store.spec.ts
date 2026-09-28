import type { TechTreeEdge, TechTreeNode } from '@zmt/renderer/tech-tree/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { AIR_TECHS_FOLDER, TechTreeStore } from './tech-tree.store';

const FIGHTER: TechTreeNode = {
  categories: ['air_equipment'],
  id: 'fighter1',
  kind: 'simple',
  position: { x: 0, y: 0 },
  token: 'fighter1',
};

const FIGHTER2: TechTreeNode = {
  ...FIGHTER,
  id: 'fighter2',
  position: { x: 0, y: 2 },
  token: 'fighter2',
};

const EDGES: readonly TechTreeEdge[] = [
  { id: 'p', kind: 'path', source: 'fighter1', target: 'fighter2' },
  { id: 'd', kind: 'dependency', source: 'fighter2', target: 'fighter1' },
];

describe('TechTreeStore', () => {
  let store: InstanceType<typeof TechTreeStore>;

  beforeEach(() => {
    store = TestBed.inject(TechTreeStore);
  });

  it('starts empty, idle and with dependencies hidden', () => {
    expect(store.nodes()).toEqual([]);
    expect(store.edges()).toEqual([]);
    expect(store.categories()).toEqual([]);
    expect(store.names()).toEqual({});
    expect(store.search()).toBe('');
    expect(store.selectedCategories()).toEqual([]);
    expect(store.selectedId()).toBeNull();
    expect(store.showDependencies()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.isEmpty()).toBe(false);
    expect(store.nodeViews()).toEqual([]);
    expect(store.selectedNode()).toBeNull();
    expect(store.visibleEdges()).toEqual([]);
    expect(AIR_TECHS_FOLDER).toBe('air_techs_folder');
  });

  it('derives node views, the selected node and the visible edges', () => {
    patchState(unprotected(store), {
      edges: EDGES,
      names: { fighter1: 'Interwar Fighter' },
      nodes: [FIGHTER, FIGHTER2],
      search: 'interwar',
      selectedId: 'fighter2',
      status: { kind: 'success' },
    });
    expect(store.isEmpty()).toBe(false);
    expect(store.selectedNode()).toBe(FIGHTER2);
    expect(store.nodeViews().map((view) => [view.id, view.highlighted, view.selected])).toEqual([
      ['fighter1', true, false],
      ['fighter2', false, true],
    ]);
    expect(store.visibleEdges().map((edge) => edge.id)).toEqual(['p']);
    patchState(unprotected(store), { showDependencies: true });
    expect(store.visibleEdges().map((edge) => edge.id)).toEqual(['p', 'd']);
    patchState(unprotected(store), { nodes: [] });
    expect(store.isEmpty()).toBe(true);
  });

  it('declares load as a pending loader', async () => {
    const errors = await collectUnhandledErrors(() => {
      store.load();
    });
    expect(errors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares the synchronous transitions as pending', () => {
    expect(() => {
      store.reload();
    }).toThrow(NotImplementedError);
    expect(() => {
      store.select('fighter1');
    }).toThrow(NotImplementedError);
    expect(() => {
      store.setSearch('x');
    }).toThrow(NotImplementedError);
    expect(() => {
      store.setSelectedCategories(['air_equipment']);
    }).toThrow(NotImplementedError);
    expect(() => {
      store.setShowDependencies(true);
    }).toThrow(NotImplementedError);
  });
});
