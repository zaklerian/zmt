import type { GameId } from '@zmt/contracts';

import type { EntityFormDescriptor } from './entity-form-descriptor.model';
import type { EntityRecognizer } from './entity-recognizer.model';

export interface RendererPlugin {
  readonly formDescriptors: readonly EntityFormDescriptor[];
  readonly gameId: GameId;
  readonly recognizers: readonly EntityRecognizer[];
}
