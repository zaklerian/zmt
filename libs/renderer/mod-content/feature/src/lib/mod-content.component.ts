import type { FsNode, IpcError } from '@zmt/contracts';
import type { HasUnsavedChanges } from '@zmt/renderer/dialog/util';
import type { FileTreeItem, ViewMode } from '@zmt/renderer/mod-content/util';

import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import {
  EntityTableStore,
  FileSearchStore,
  FileTreeStore,
  ModContentStore,
  PlainEditorStore,
} from '@zmt/renderer/mod-content/data-access';
import {
  ContentModeToggleComponent,
  ContentPlaceholderComponent,
  EntityTableComponent,
  FileSearchComponent,
  FileTreeComponent,
  NoFolderStateComponent,
  PanelBreadcrumbsComponent,
  PlainEditorComponent,
} from '@zmt/renderer/mod-content/ui';
import { isDescriptorPath } from '@zmt/renderer/mod-info/util';
import { PluginRegistryStore } from '@zmt/renderer/plugin/data-access';
import { ROUTE_PATHS } from '@zmt/renderer/shell/ui';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';

@Component({
  imports: [
    ContentModeToggleComponent,
    ContentPlaceholderComponent,
    EntityTableComponent,
    FileSearchComponent,
    FileTreeComponent,
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
  private readonly plugins = inject(PluginRegistryStore);
  private readonly router = inject(Router);
  protected readonly content = inject(ModContentStore);
  protected readonly editor = inject(PlainEditorStore);
  protected readonly entities = inject(EntityTableStore);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly search = inject(FileSearchStore);
  protected readonly tree = inject(FileTreeStore);
  protected readonly workspace = inject(WorkspaceStore);

  readonly dirty = this.editor.dirty;

  protected readonly saveError = computed<IpcError | null>(() => {
    const status = this.editor.saveStatus();
    return status.kind === 'error' ? status.error : null;
  });

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

  protected onModeChange(mode: ViewMode): void {
    if (mode === 'table' && this.content.structuredView() === 'form') {
      void this.router.navigate(['/', ROUTE_PATHS.modInfo]);
      return;
    }
    this.content.setViewMode(mode);
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
      this.content.select(null);
      return;
    }
    this.selectNode(item.node, item.id === this.workspace.root());
  }

  private selectNode(node: FsNode, isModRoot: boolean): void {
    this.content.select({
      isDescriptor: isDescriptorPath(node.path),
      isModRoot,
      path: node.path,
      recognizerId: this.plugins.recognize(node.path)?.id ?? null,
      support: node.support,
    });
  }
}
