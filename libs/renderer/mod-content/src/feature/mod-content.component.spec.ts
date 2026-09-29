import type { FsNode } from '@zmt/contracts';

import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { DialogService, flushPromises } from '@zmt/renderer/core';
import { I18nStore, WorkspaceStore } from '@zmt/renderer/shell/data-access';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';
import { of } from 'rxjs';

import type { FileTreeItem } from '../util';

import {
  FileSearchStore,
  FileTreeStore,
  ModContentService,
  ModContentStore,
  PlainEditorStore,
} from '../data-access';
import {
  ContentModeToggleComponent,
  FileSearchComponent,
  FileTreeComponent,
  NoFolderStateComponent,
  PlainEditorComponent,
} from '../ui';
import { ModContentComponent, SAVED_SNACKBAR_MS } from './mod-content.component';

const ROOT_ITEM: FileTreeItem = {
  children: null,
  error: null,
  expandable: true,
  id: '/mods/my-mod',
  label: 'my-mod',
  node: null,
};

const DESCRIPTOR_NODE: FsNode = {
  extension: '.mod',
  hasChildren: false,
  name: 'descriptor.mod',
  path: '/mods/my-mod/descriptor.mod',
  support: 'editable',
  type: 'file',
};

const FILE_ITEM: FileTreeItem = {
  children: null,
  error: null,
  expandable: false,
  id: '/mods/my-mod/descriptor.mod',
  label: 'descriptor.mod',
  node: DESCRIPTOR_NODE,
};

const README_ITEM: FileTreeItem = {
  ...FILE_ITEM,
  id: '/mods/my-mod/readme.txt',
  label: 'readme.txt',
  node: {
    ...DESCRIPTOR_NODE,
    extension: '.txt',
    name: 'readme.txt',
    path: '/mods/my-mod/readme.txt',
  },
};

describe('ModContentComponent', () => {
  const listDirectory = vi.fn();
  const readTextFile = vi.fn();
  const searchFiles = vi.fn();
  const writeTextFile = vi.fn();
  const confirm = vi.fn();

  beforeEach(() => {
    for (const method of [listDirectory, readTextFile, searchFiles, writeTextFile, confirm]) {
      method.mockReset();
    }
    listDirectory.mockResolvedValue(ok([]));
    readTextFile.mockResolvedValue(ok('hello'));
    searchFiles.mockResolvedValue(ok([]));
    confirm.mockReturnValue(of(true));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ModContentService,
          useValue: { listDirectory, readTextFile, searchFiles, writeTextFile },
        },
        { provide: DialogService, useValue: { confirm } },
        { provide: MESSAGES, useFactory: () => inject(I18nStore).messages },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ModContentComponent);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('shows the title and the no-folder state until a root folder is open', async () => {
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.modContent.title);
    expect(fixture.debugElement.query(By.directive(NoFolderStateComponent))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(FileTreeComponent))).toBeNull();
    expect(fixture.componentInstance.dirty()).toBe(false);
    expect(listDirectory).not.toHaveBeenCalled();
  });

  it('shows why the folder could not be opened', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), {
      status: { error: { code: 500, message: 'x' }, kind: 'error' },
    });
    const { host } = await setup();
    expect(host.querySelector('.folder-error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.modContent.folderFailed} ${EN_MESSAGES.errors[500]}`,
    );
  });

  it('loads the tree when a root opens and reloads when the file filter changes', async () => {
    const workspace = TestBed.inject(WorkspaceStore);
    patchState(unprotected(workspace), { root: '/mods/my-mod' });
    const { fixture } = await setup();
    await flushPromises();
    expect(listDirectory).toHaveBeenCalledWith({
      options: { hideUnsupportedFiles: false },
      path: '/mods/my-mod',
    });
    expect(TestBed.inject(FileTreeStore).root()).toBe('/mods/my-mod');
    expect(fixture.debugElement.query(By.directive(FileTreeComponent))).not.toBeNull();
    expect(TestBed.inject(FileSearchStore).query()).toBe('');
  });

  it('shows the tree error when the root listing fails', async () => {
    listDirectory.mockResolvedValue(fail(403, 'denied'));
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    const { fixture, host } = await setup();
    await flushPromises();
    await fixture.whenStable();
    expect(host.querySelector('.tree-error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.modContent.fileTreeFailed} ${EN_MESSAGES.errors[403]}`,
    );
  });

  it('passes selections and searches to the stores and routes a root selection', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    const content = TestBed.inject(ModContentStore);
    const select = vi.spyOn(content, 'select');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const search = vi.spyOn(TestBed.inject(FileSearchStore), 'search');
    const { fixture } = await setup();

    const tree = fixture.debugElement
      .query(By.directive(FileTreeComponent))
      .injector.get(FileTreeComponent);
    tree.selectItem.emit(ROOT_ITEM);
    expect(select).toHaveBeenLastCalledWith(null);
    expect(navigate).toHaveBeenCalledWith(['/', 'mod-info']);
    tree.selectItem.emit(FILE_ITEM);
    expect(select).toHaveBeenLastCalledWith({
      isDescriptor: true,
      isModRoot: false,
      path: FILE_ITEM.id,
      support: 'editable',
    });

    const fileSearch = fixture.debugElement
      .query(By.directive(FileSearchComponent))
      .injector.get(FileSearchComponent);
    fileSearch.query.set('air');
    expect(search).toHaveBeenLastCalledWith({
      hideUnsupportedFiles: false,
      query: 'air',
      root: '/mods/my-mod',
    });
  });

  it('loads a selected text file into the editor and saves through it', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    writeTextFile.mockResolvedValue(ok(null));
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    const { fixture } = await setup();
    const tree = fixture.debugElement
      .query(By.directive(FileTreeComponent))
      .injector.get(FileTreeComponent);
    tree.selectItem.emit(README_ITEM);
    await fixture.whenStable();
    await flushPromises();
    await fixture.whenStable();
    expect(readTextFile).toHaveBeenCalledWith({ path: README_ITEM.id });
    const editor = fixture.debugElement
      .query(By.directive(PlainEditorComponent))
      .injector.get(PlainEditorComponent);
    expect(editor.text()).toBe('hello');
    editor.text.set('hello world');
    expect(fixture.componentInstance.dirty()).toBe(true);
    editor.save.emit();
    await flushPromises();
    expect(writeTextFile).toHaveBeenCalledWith({
      content: 'hello world',
      path: README_ITEM.id,
    });
    expect(TestBed.inject(PlainEditorStore).saveStatus()).toEqual({ kind: 'success' });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(EN_MESSAGES.modContent.saved, undefined, {
      duration: SAVED_SNACKBAR_MS,
    });

    fixture.destroy();
    await setup();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('asks before replacing a dirty editor and keeps the file when refused', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    confirm.mockReturnValue(of(false));
    const { fixture } = await setup();
    const tree = fixture.debugElement
      .query(By.directive(FileTreeComponent))
      .injector.get(FileTreeComponent);
    tree.selectItem.emit(README_ITEM);
    await flushPromises();
    TestBed.inject(PlainEditorStore).updateText('changed');
    tree.selectItem.emit(FILE_ITEM);
    expect(confirm).toHaveBeenCalledWith({
      cancelLabel: EN_MESSAGES.actions.cancel,
      confirmLabel: EN_MESSAGES.actions.discard,
      message: EN_MESSAGES.dialog.unsavedChangesMessage,
      title: EN_MESSAGES.dialog.unsavedChangesTitle,
    });
    expect(TestBed.inject(ModContentStore).selectedPath()).toBe(README_ITEM.id);
    confirm.mockReturnValue(of(true));
    tree.selectItem.emit(FILE_ITEM);
    expect(TestBed.inject(ModContentStore).selectedPath()).toBe(FILE_ITEM.id);
  });

  it('shows the editor error with a retry that reloads the file', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    readTextFile.mockResolvedValueOnce(fail(404, 'missing')).mockResolvedValueOnce(ok('back'));
    const { fixture, host } = await setup();
    const tree = fixture.debugElement
      .query(By.directive(FileTreeComponent))
      .injector.get(FileTreeComponent);
    tree.selectItem.emit(README_ITEM);
    await flushPromises();
    await fixture.whenStable();
    expect(host.querySelector('.editor-error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.modContent.editorFailed} ${EN_MESSAGES.errors[404]}`,
    );
    host.querySelector<HTMLButtonElement>('.retry')?.click();
    await flushPromises();
    expect(TestBed.inject(PlainEditorStore).text()).toBe('back');
  });

  it('routes the descriptor form view to the mod-info page', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    patchState(unprotected(TestBed.inject(ModContentStore)), {
      selection: {
        isDescriptor: true,
        isModRoot: false,
        path: '/mods/my-mod/descriptor.mod',
        support: 'editable',
      },
      viewMode: 'code',
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, host } = await setup();
    expect(host.querySelectorAll('li').length).toBe(2);
    const toggle = fixture.debugElement
      .query(By.directive(ContentModeToggleComponent))
      .injector.get(ContentModeToggleComponent);
    toggle.mode.set('table');
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/', 'mod-info']);
  });
});
