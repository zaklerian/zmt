import type { FileSupport } from '@zmt/contracts';

export interface FileSelection {
  readonly isDescriptor: boolean;
  readonly isModRoot: boolean;
  readonly path: string;
  readonly support: FileSupport;
}
