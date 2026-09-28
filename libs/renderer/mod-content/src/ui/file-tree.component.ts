import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { NavIconComponent } from '@zmt/renderer/shell/ui';

import type { FileTreeItem } from '../util';

@Component({
  imports: [MatButtonModule, MatTreeModule, NavIconComponent],
  selector: 'zmt-file-tree',
  styleUrl: './file-tree.component.scss',
  templateUrl: './file-tree.component.html',
})
export class FileTreeComponent {
  readonly expand = output<FileTreeItem>();
  readonly expanded = input<readonly string[]>([]);
  readonly items = input.required<readonly FileTreeItem[]>();
  protected readonly messages = inject(MESSAGES);
  readonly selectItem = output<FileTreeItem>();
  readonly selectedId = input<null | string>(null);

  protected readonly dataSource = computed(() => [...this.items()]);

  protected readonly childrenOf = (item: FileTreeItem) => [...(item.children ?? [])];

  protected readonly keyOf = (item: FileTreeItem): string => item.id;

  protected readonly trackById = (index: number, item: FileTreeItem): string => item.id;

  protected readonly isExpandable = (...args: readonly [number, FileTreeItem]): boolean =>
    args[1].expandable;

  protected errorText(item: FileTreeItem): null | string {
    const texts = this.messages();
    return item.error === null
      ? null
      : `${texts.modContent.fileTreeFailed} ${texts.errors[item.error.code]}`;
  }

  protected isInitiallyExpanded(item: FileTreeItem): boolean {
    return this.expanded().includes(item.id);
  }
}
