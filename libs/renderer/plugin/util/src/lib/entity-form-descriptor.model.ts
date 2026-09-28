import type { GameId } from '@zmt/contracts';
import type { EntityFormMode, EntityFormModel } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

export interface EntityFormProjectContext {
  readonly filePath: string;
  readonly messages: Messages;
  readonly mode: EntityFormMode;
}

export interface EntityFormDescriptor {
  readonly entityId: string;
  readonly gameId: GameId;
  readonly project: (subject: unknown, context: EntityFormProjectContext) => EntityFormModel;
}
