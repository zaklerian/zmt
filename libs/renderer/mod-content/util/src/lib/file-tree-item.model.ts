import type { FsNode, IpcError } from '@zmt/contracts';

export interface FileTreeItem {
  readonly children: null | readonly FileTreeItem[];
  readonly error: IpcError | null;
  readonly expandable: boolean;
  readonly id: string;
  readonly label: string;
  readonly node: FsNode | null;
}
