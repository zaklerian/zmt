import type { IpcErrorCode, IpcResult } from '@zmt/contracts';
import type { ConfirmDialogOptions } from '@zmt/renderer/dialog/util';

import type { EntityFormBlock } from './entity-form-block.model';

export const ENTITY_FORM_MODES = {
  add: 'add',
  edit: 'edit',
} as const satisfies Record<string, string>;

export type EntityFormMode = (typeof ENTITY_FORM_MODES)[keyof typeof ENTITY_FORM_MODES];

export type EntityFormValues = Readonly<Record<string, unknown>>;

export interface EntityFormModel {
  readonly blocks: readonly EntityFormBlock[];
  readonly confirmBeforeSave?: (values: EntityFormValues) => ConfirmDialogOptions | null;
  readonly dialogTitle?: string;
  readonly errorMessage: (code: IpcErrorCode) => string;
  readonly errorTitle: string;
  readonly note?: string;
  readonly save: (values: EntityFormValues) => Promise<IpcResult<EntityFormValues | null>>;
}
