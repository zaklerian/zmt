import type { FsNode, IpcError } from '@zmt/contracts';
import type { HasUnsavedChanges } from '@zmt/renderer/core';

import { Component, computed, effect, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { DialogService, errorOf } from '@zmt/renderer/core';
import { isDescriptorPath } from '@zmt/renderer/mod-info/util';
import { I18nStore, WorkspaceStore } from '@zmt/renderer/shell/data-access';
import { ROUTE_PATHS } from '@zmt/renderer/shell/ui';
import { distinctUntilChanged, filter, map, type Observable } from 'rxjs';

import type { LoadRootRequest } from '../data-access';
import type { FileSelection, FileTreeItem, ViewMode } from '../util';

import { FileSearchStore, FileTreeStore, ModContentStore, PlainEditorStore } from '../data-access';
import {
  ContentModeToggleComponent,
  ContentPlaceholderComponent,
  FileSearchComponent,
  FileTreeComponent,
  NoFolderStateComponent,
  PanelBreadcrumbsComponent,
  PlainEditorComponent,
} from '../ui';

export const SAVED_SNACKBAR_MS = 3000;

function present<T>(source$: Observable<T | null>): Observable<T> {
  return source$.pipe(filter((value): value is T => value !== null));
}

@Component({
  imports: [
    ContentModeToggleComponent,
    ContentPlaceholderComponent,
    FileSearchComponent,
    FileTreeComponent,
    MatButtonModule,
    NoFolderStateComponent,
    PanelBreadcrumbsComponent,
    PlainEditorComponent,
  ],
  selector: 'zmt-mod-content',
  styleUrl: './mod-content.component.scss',
  templateUrl: './mod-content.component.html',
})
export class ModContentComponent implements HasUnsavedChanges {
  private readonly appSettings = inject(AppSettingsStore);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly content = inject(ModContentStore);
  protected readonly editor = inject(PlainEditorStore);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly search = inject(FileSearchStore);
  protected readonly tree = inject(FileTreeStore);
  protected readonly workspace = inject(WorkspaceStore);

  readonly dirty = this.editor.dirty;

  protected readonly editorError = computed(() => errorOf(this.editor.status()));
  protected readonly folderError = computed(() => errorOf(this.workspace.status()));
  protected readonly saveError = computed<IpcError | null>(() => errorOf(this.editor.saveStatus()));
  protected readonly searchError = computed(() => errorOf(this.search.status()));
  protected readonly treeError = computed(() => errorOf(this.tree.status()));

  protected readonly segments = computed<readonly string[]>(() => {
    const root = this.workspace.root();
    const path = this.content.selectedPath();
    if (root === null || !path?.startsWith(root)) {
      return [];
    }
    return path
      .slice(root.length)
      .split(/[/\\]/u)
      .filter((segment) => segment.length > 0);
  });

  private readonly rootRequest = computed<LoadRootRequest | null>(() => {
    const root = this.workspace.root();
    return root === null
      ? null
      : { hideUnsupportedFiles: this.appSettings.hideUnsupportedFiles(), root };
  });

  private readonly editorPath = computed<null | string>(() =>
    this.content.contentKind() === 'editor' ? this.content.selectedPath() : null,
  );

  constructor() {
    this.tree.loadRoot(
      present(toObservable(this.rootRequest)).pipe(
        distinctUntilChanged(
          (previous, next) =>
            previous.root === next.root &&
            previous.hideUnsupportedFiles === next.hideUnsupportedFiles,
        ),
      ),
    );
    this.editor.load(present(toObservable(this.editorPath)).pipe(distinctUntilChanged()));
    this.search.search(
      toObservable(this.workspace.root).pipe(
        map((root) => ({
          hideUnsupportedFiles: this.appSettings.hideUnsupportedFiles(),
          query: '',
          root,
        })),
      ),
    );
    effect(() => {
      if (this.editor.saveStatus().kind === 'success') {
        this.snackBar.open(this.messages().modContent.saved, undefined, {
          duration: SAVED_SNACKBAR_MS,
        });
      }
    });
  }

  protected onModeChange(mode: ViewMode): void {
    if (mode === 'table') {
      void this.router.navigate(['/', ROUTE_PATHS.modInfo]);
      return;
    }
    this.confirmLeaveIfDirty(() => {
      this.content.setViewMode(mode);
    });
  }

  protected onSearch(query: string): void {
    this.search.search({
      hideUnsupportedFiles: this.appSettings.hideUnsupportedFiles(),
      query,
      root: this.workspace.root(),
    });
  }

  protected onSearchSelect(node: FsNode): void {
    this.selectNode(node, false);
  }

  protected onTreeSelect(item: FileTreeItem): void {
    if (item.node === null) {
      this.confirmLeaveIfDirty(() => {
        this.content.select(null);
        void this.router.navigate(['/', ROUTE_PATHS.modInfo]);
      });
      return;
    }
    this.selectNode(item.node, item.id === this.workspace.root());
  }

  protected retryEditor(): void {
    const path = this.editorPath();
    if (path !== null) {
      this.editor.load(path);
    }
  }

  private confirmLeaveIfDirty(proceed: () => void): void {
    if (!this.editor.dirty()) {
      proceed();
      return;
    }
    const texts = this.messages();
    this.dialog
      .confirm({
        cancelLabel: texts.actions.cancel,
        confirmLabel: texts.actions.discard,
        message: texts.dialog.unsavedChangesMessage,
        title: texts.dialog.unsavedChangesTitle,
      })
      .pipe(filter((confirmed) => confirmed))
      .subscribe(() => {
        proceed();
      });
  }

  private selectNode(node: FsNode, isModRoot: boolean): void {
    const selection: FileSelection = {
      isDescriptor: isDescriptorPath(node.path),
      isModRoot,
      path: node.path,
      support: node.support,
    };
    if (selection.path === this.content.selectedPath()) {
      this.content.select(selection);
      return;
    }
    this.confirmLeaveIfDirty(() => {
      this.content.select(selection);
    });
  }
}
