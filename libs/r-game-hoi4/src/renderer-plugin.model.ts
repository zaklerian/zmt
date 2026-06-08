import type { JSX } from 'react';

import { GameId, LocaleResources } from '@contracts';

export interface RendererPlugin {
  readonly components: {
    readonly traits: () => JSX.Element;
  };
  readonly gameId: GameId;
  readonly localeResources?: LocaleResources;
}
