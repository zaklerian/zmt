import type { FileSelection } from '@zmt/renderer/mod-content/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { ModContentStore, naturalViewMode, resolveContentKind } from './mod-content.store';

const DESCRIPTOR: FileSelection = {
  isDescriptor: true,
  isModRoot: false,
  path: '/mod/descriptor.mod',
  support: 'editable',
};

const PLAIN: FileSelection = { ...DESCRIPTOR, isDescriptor: false, path: '/mod/readme.txt' };

const IMAGE: FileSelection = { ...PLAIN, path: '/mod/thumb.png', support: 'readonly' };

describe('ModContentStore', () => {
  let store: InstanceType<typeof ModContentStore>;

  beforeEach(() => {
    store = TestBed.inject(ModContentStore);
  });

  it('starts with nothing selected in table mode', () => {
    expect(store.selection()).toBeNull();
    expect(store.viewMode()).toBe('table');
    expect(store.selectedPath()).toBeNull();
    expect(store.contentKind()).toBe('placeholder');
    expect(store.showsModeToggle()).toBe(false);
  });

  it('derives the content kind and toggle from the selection', () => {
    patchState(unprotected(store), { selection: DESCRIPTOR });
    expect(store.selectedPath()).toBe(DESCRIPTOR.path);
    expect(store.contentKind()).toBe('descriptor');
    expect(store.showsModeToggle()).toBe(true);

    patchState(unprotected(store), { selection: PLAIN });
    expect(store.contentKind()).toBe('editor');
    expect(store.showsModeToggle()).toBe(false);

    patchState(unprotected(store), { selection: IMAGE });
    expect(store.contentKind()).toBe('placeholder');
  });

  it('resolves code mode to the editor for the descriptor and editable files only', () => {
    expect(resolveContentKind(DESCRIPTOR, 'code')).toBe('editor');
    expect(resolveContentKind(PLAIN, 'code')).toBe('editor');
    expect(resolveContentKind({ ...DESCRIPTOR, support: 'readonly' }, 'code')).toBe('editor');
    expect(resolveContentKind(IMAGE, 'code')).toBe('placeholder');
    expect(resolveContentKind(IMAGE, 'table')).toBe('placeholder');
    expect(resolveContentKind(null, 'code')).toBe('placeholder');
  });

  it('selects a file and switches the view mode', () => {
    store.select(PLAIN);
    expect(store.selection()).toBe(PLAIN);
    store.setViewMode('code');
    expect(store.viewMode()).toBe('code');
    expect(store.contentKind()).toBe('editor');
  });

  it('opens a descriptor in code view because its form is a route', () => {
    expect(naturalViewMode(DESCRIPTOR)).toBe('code');
    expect(naturalViewMode(PLAIN)).toBe('table');
    expect(naturalViewMode(null)).toBe('table');
    store.select(DESCRIPTOR);
    expect(store.viewMode()).toBe('code');
    expect(store.contentKind()).toBe('editor');
    store.select(PLAIN);
    expect(store.viewMode()).toBe('table');
  });

  it('keeps the view mode for the same path and resets it when the path changes', () => {
    store.select(DESCRIPTOR);
    store.setViewMode('table');
    store.select({ ...DESCRIPTOR });
    expect(store.viewMode()).toBe('table');
    store.select(PLAIN);
    expect(store.viewMode()).toBe('table');
    store.setViewMode('code');
    store.select(null);
    expect(store.selection()).toBeNull();
    expect(store.viewMode()).toBe('table');
  });
});
