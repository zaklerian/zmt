import type { IpcResult } from '@zmt/contracts';
import type { Messages } from '@zmt/shared/i18n';

import type { EntityTableData } from './entity-table.model';

export interface EntityRecognizer {
  readonly id: string;
  readonly load: (filePath: string, messages: Messages) => Promise<IpcResult<EntityTableData>>;
  readonly matches: (filePath: string) => boolean;
}
