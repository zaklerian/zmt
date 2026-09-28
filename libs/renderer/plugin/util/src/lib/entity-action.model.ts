import type { ConfirmDialogOptions } from '@zmt/renderer/dialog/util';
import type { EntityFormModel } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

export interface EntityActionAvailability {
  readonly filePath: string;
  readonly selectedRowId: null | string;
  readonly writable: boolean;
}

export interface EntityActionContext extends EntityActionAvailability {
  readonly confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  readonly messages: Messages;
}

export type EntityActionEffect =
  | { readonly form: EntityFormModel; readonly kind: 'openForm' }
  | { readonly kind: 'none' }
  | { readonly kind: 'refresh' };

export interface EntityAction {
  readonly execute: (context: EntityActionContext) => Promise<EntityActionEffect>;
  readonly id: string;
  readonly isAvailable: (availability: EntityActionAvailability) => boolean;
  readonly label: string;
}

export interface EntityActionView {
  readonly available: boolean;
  readonly id: string;
  readonly label: string;
}
