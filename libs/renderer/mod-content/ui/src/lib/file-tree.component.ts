import type { FileTreeItem } from '@zmt/renderer/mod-content/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { NavIconComponent } from '@zmt/renderer/shell/ui';

@Component({
  imports: [MatButtonModule, MatTreeModule, NavIconComponent],
  selector: 'zmt-file-tree',
  styleUrl: './file-tree.component.scss',
  templateUrl: './file-tree.component.html',
})
export class FileTreeComponent {
  readonly expand = output<FileTreeItem>();
  readonly items = input.required<readonly FileTreeItem[]>();
  readonly messages = input.required<Messages>();
  readonly selectItem = output<FileTreeItem>();
  readonly selectedId = input<null | string>(null);

  protected readonly dataSource = computed(() => [...this.items()]);

  protected readonly childrenOf = (item: FileTreeItem) => [...(item.children ?? [])];

  protected readonly isExpandable = (...args: readonly [number, FileTreeItem]): boolean =>
    args[1].expandable;
}
