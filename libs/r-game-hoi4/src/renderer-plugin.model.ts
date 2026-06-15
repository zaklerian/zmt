import type { JSX } from 'react';

import { GameId, LocaleResources } from '@contracts';
import { EntityFormDescriptor, EntityTableRecognizer } from '@r-core';

export interface RendererPlugin {
  readonly components: {
    readonly traits: () => JSX.Element;
  };
  readonly formDescriptors?: readonly EntityFormDescriptor[];
  readonly gameId: GameId;
  readonly localeResources?: LocaleResources;
  readonly recognizers?: readonly EntityTableRecognizer[];
}
