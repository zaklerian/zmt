import { FileSupport } from './file-support.const';

export interface FsNode {
  readonly extension: null | string;
  readonly hasChildren: boolean;
  readonly name: string;
  readonly path: string;
  readonly support: FileSupport;
  readonly type: 'directory' | 'file';
}
