import type { FileSupport } from '@zmt/contracts';

export interface FileSelection {
  readonly isDescriptor: boolean;
  readonly isModRoot: boolean;
  readonly path: string;
  readonly recognizerId: null | string;
  readonly support: FileSupport;
}
