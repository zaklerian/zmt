import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { PlainEditorStore } from './plain-editor.store';

describe('PlainEditorStore', () => {
  let store: InstanceType<typeof PlainEditorStore>;

  beforeEach(() => {
    store = TestBed.inject(PlainEditorStore);
  });

  it('starts with no file, empty text and idle statuses', () => {
    expect(store.filePath()).toBeNull();
    expect(store.text()).toBe('');
    expect(store.originalText()).toBe('');
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    expect(store.dirty()).toBe(false);
    expect(store.saving()).toBe(false);
  });

  it('derives dirtiness from the text diverging from the original', () => {
    patchState(unprotected(store), { originalText: 'a = 1', text: 'a = 1' });
    expect(store.dirty()).toBe(false);
    patchState(unprotected(store), { text: 'a = 2' });
    expect(store.dirty()).toBe(true);
    patchState(unprotected(store), { saveStatus: { kind: 'loading' } });
    expect(store.saving()).toBe(true);
  });

  it('declares load and save as pending loaders', async () => {
    const loadErrors = await collectUnhandledErrors(() => {
      store.load('/mod/readme.txt');
    });
    expect(loadErrors).toEqual([expect.any(NotImplementedError)]);
    const saveErrors = await collectUnhandledErrors(() => {
      store.save();
    });
    expect(saveErrors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares updateText and reset as pending', () => {
    expect(() => {
      store.updateText('x');
    }).toThrow(NotImplementedError);
    expect(() => {
      store.reset();
    }).toThrow(NotImplementedError);
  });
});
