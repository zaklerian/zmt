import type { FileTreeItem } from '@zmt/renderer/mod-content/util';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import {
  FileSearchStore,
  FileTreeStore,
  ModContentStore,
} from '@zmt/renderer/mod-content/data-access';
import {
  ContentModeToggleComponent,
  FileSearchComponent,
  FileTreeComponent,
  NoFolderStateComponent,
} from '@zmt/renderer/mod-content/ui';
import { PluginRegistryStore } from '@zmt/renderer/plugin/data-access';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ModContentComponent } from './mod-content.component';

const ROOT_ITEM: FileTreeItem = {
  children: null,
  expandable: true,
  id: '/mods/my-mod',
  label: 'my-mod',
  node: null,
};

const FILE_ITEM: FileTreeItem = {
  children: null,
  expandable: false,
  id: '/mods/my-mod/descriptor.mod',
  label: 'descriptor.mod',
  node: {
    extension: '.mod',
    hasChildren: false,
    name: 'descriptor.mod',
    path: '/mods/my-mod/descriptor.mod',
    support: 'editable',
    type: 'file',
  },
};

describe('ModContentComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
  });

  it('renders the sidebar and passes selections and searches to the stores', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    patchState(unprotected(TestBed.inject(FileTreeStore)), { root: '/mods/my-mod' });
    const content = TestBed.inject(ModContentStore);
    const select = vi.spyOn(content, 'select').mockImplementation(() => undefined);
    const search = vi
      .spyOn(TestBed.inject(FileSearchStore), 'search')
      .mockImplementation(() => ({ destroy: () => undefined }));
    vi.spyOn(TestBed.inject(PluginRegistryStore), 'recognize').mockReturnValue(null);
    const { fixture } = await setup();

    const tree = fixture.debugElement
      .query(By.directive(FileTreeComponent))
      .injector.get(FileTreeComponent);
    tree.selectItem.emit(ROOT_ITEM);
    expect(select).toHaveBeenLastCalledWith(null);
    tree.selectItem.emit(FILE_ITEM);
    expect(select).toHaveBeenLastCalledWith({
      isDescriptor: true,
      isModRoot: false,
      path: FILE_ITEM.id,
      recognizerId: null,
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

  it('routes the descriptor form view to the mod-info page', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    patchState(unprotected(TestBed.inject(ModContentStore)), {
      selection: {
        isDescriptor: true,
        isModRoot: false,
        path: '/mods/my-mod/descriptor.mod',
        recognizerId: null,
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
