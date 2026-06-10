import { GAME_IDS } from '@contracts';

import { EQUIPMENT_RECOGNIZER } from './equipment';
import { Hoi4TraitsComponent } from './hoi4-traits.component';
import { HOI4_LOCALE_RESOURCES } from './locales';
import { RendererPlugin } from './renderer-plugin.model';

export const HOI4_RENDERER_PLUGIN: RendererPlugin = {
  components: {
    traits: Hoi4TraitsComponent,
  },
  gameId: GAME_IDS.hoi4,
  localeResources: HOI4_LOCALE_RESOURCES,
  recognizers: [EQUIPMENT_RECOGNIZER],
};
