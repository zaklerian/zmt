import type { JSX } from 'react';

import { GameId, LocaleResources } from '@contracts';
import { EntityTableRecognizer } from '@r-core';

export interface RendererPlugin {
  readonly components: {
    readonly traits: () => JSX.Element;
  };
  readonly gameId: GameId;
  readonly localeResources?: LocaleResources;
  readonly recognizers?: readonly EntityTableRecognizer[];
}
