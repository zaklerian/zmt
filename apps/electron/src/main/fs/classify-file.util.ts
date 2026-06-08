import { FILE_SUPPORT, FileSupport } from '@contracts';

import { DEFAULT_FILE_CLASSIFICATION } from './default-file-classification.const';

const EDITABLE_EXTENSIONS = new Set<string>(
  Object.values(DEFAULT_FILE_CLASSIFICATION.editable).flat(),
);

const READONLY_EXTENSIONS = new Set<string>(
  Object.values(DEFAULT_FILE_CLASSIFICATION.readonly).flat(),
);

export function classifyFile(extension: null | string): FileSupport {
  if (extension === null) return FILE_SUPPORT.unsupported;
  if (EDITABLE_EXTENSIONS.has(extension)) return FILE_SUPPORT.editable;
  if (READONLY_EXTENSIONS.has(extension)) return FILE_SUPPORT.readonly;
  return FILE_SUPPORT.unsupported;
}
