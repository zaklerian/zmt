import type { FsNode } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { FileTreeStore } from './file-tree.store';

const README: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'readme.txt',
  path: '/mod/readme.txt',
  support: 'editable',
  type: 'file',
};

describe('FileTreeStore', () => {
  let store: InstanceType<typeof FileTreeStore>;

  beforeEach(() => {
    store = TestBed.inject(FileTreeStore);
  });

  it('starts with no root, no children and nothing expanded', () => {
    expect(store.root()).toBeNull();
    expect(store.childrenByPath()).toEqual({});
    expect(store.expanded()).toEqual([]);
    expect(store.hideUnsupportedFiles()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.rootChildren()).toEqual([]);
    expect(store.items()).toEqual([]);
    expect(store.isEmpty()).toBe(false);
  });

  it('derives the root children, items and emptiness from the loaded map', () => {
    patchState(unprotected(store), { root: '/mod' });
    expect(store.rootChildren()).toEqual([]);
    expect(store.isEmpty()).toBe(true);
    expect(store.items()).toEqual([
      { children: null, expandable: true, id: '/mod', label: 'mod', node: null },
    ]);

    patchState(unprotected(store), { childrenByPath: { '/mod': [README] } });
    expect(store.rootChildren()).toEqual([README]);
    expect(store.isEmpty()).toBe(false);
    expect(store.items()[0]?.children).toHaveLength(1);
  });

  it('declares loadRoot and loadChildren as pending loaders', async () => {
    const rootErrors = await collectUnhandledErrors(() => {
      store.loadRoot({ hideUnsupportedFiles: false, root: '/mod' });
    });
    expect(rootErrors).toEqual([expect.any(NotImplementedError)]);
    const childErrors = await collectUnhandledErrors(() => {
      store.loadChildren('/mod/common');
    });
    expect(childErrors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares setExpanded as pending', () => {
    expect(() => {
      store.setExpanded(['/mod']);
    }).toThrow(NotImplementedError);
  });
});
