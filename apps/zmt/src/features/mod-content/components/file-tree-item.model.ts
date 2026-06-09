import { FsNode } from '@contracts';

export interface FsTreeItem {
  readonly children?: readonly FsTreeItem[];
  id: string;
  label: string;
  readonly node: FsNode | null;
}
