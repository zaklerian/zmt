import type { FileSelection } from '@zmt/renderer/mod-content/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { NotImplementedError } from '@zmt/renderer/pending/util';

import { ModContentStore, resolveContentKind } from './mod-content.store';

const ENTITY_FILE: FileSelection = {
  isDescriptor: false,
  isModRoot: false,
  path: '/mod/common/technologies/air.txt',
  recognizerId: 'hoi4-technology',
  support: 'editable',
};

const DESCRIPTOR: FileSelection = {
  ...ENTITY_FILE,
  isDescriptor: true,
  path: '/mod/descriptor.mod',
  recognizerId: null,
};

const PLAIN: FileSelection = { ...ENTITY_FILE, path: '/mod/readme.txt', recognizerId: null };

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
    expect(store.structuredView()).toBe('table');
  });

  it('derives the content kind and toggle from the selection', () => {
    patchState(unprotected(store), { selection: ENTITY_FILE });
    expect(store.selectedPath()).toBe(ENTITY_FILE.path);
    expect(store.contentKind()).toBe('entityTable');
    expect(store.showsModeToggle()).toBe(true);
    expect(store.structuredView()).toBe('table');

    patchState(unprotected(store), { selection: DESCRIPTOR });
    expect(store.contentKind()).toBe('descriptor');
    expect(store.structuredView()).toBe('form');

    patchState(unprotected(store), { selection: PLAIN });
    expect(store.contentKind()).toBe('editor');
    expect(store.showsModeToggle()).toBe(false);
  });

  it('resolves code mode to the editor for structured and editable files only', () => {
    expect(resolveContentKind(ENTITY_FILE, 'code')).toBe('editor');
    expect(resolveContentKind(DESCRIPTOR, 'code')).toBe('editor');
    expect(resolveContentKind(PLAIN, 'code')).toBe('editor');
    expect(resolveContentKind(IMAGE, 'code')).toBe('placeholder');
    expect(resolveContentKind(IMAGE, 'table')).toBe('placeholder');
    expect(resolveContentKind(null, 'code')).toBe('placeholder');
  });

  it('declares select and setViewMode as pending', () => {
    expect(() => {
      store.select(ENTITY_FILE);
    }).toThrow(NotImplementedError);
    expect(() => {
      store.setViewMode('code');
    }).toThrow(NotImplementedError);
  });
});
