import type { FsNode } from '@zmt/contracts';

export interface FileTreeItem {
  readonly children: null | readonly FileTreeItem[];
  readonly expandable: boolean;
  readonly id: string;
  readonly label: string;
  readonly node: FsNode | null;
}
