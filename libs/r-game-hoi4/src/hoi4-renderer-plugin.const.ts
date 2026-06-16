import { GAME_IDS } from '@contracts';

import { CHARACTER_FORM_DESCRIPTOR, CHARACTER_RECOGNIZER } from './character';
import { EQUIPMENT_RECOGNIZER, PLANE_FORM_DESCRIPTOR } from './equipment';
import { Hoi4TraitsComponent } from './hoi4-traits.component';
import { HOI4_LOCALE_RESOURCES } from './locales';
import { MODULE_FORM_DESCRIPTOR, MODULE_RECOGNIZER } from './module';
import { RendererPlugin } from './renderer-plugin.model';

export const HOI4_RENDERER_PLUGIN: RendererPlugin = {
  components: {
    traits: Hoi4TraitsComponent,
  },
  formDescriptors: [
    CHARACTER_FORM_DESCRIPTOR,
    MODULE_FORM_DESCRIPTOR,
    PLANE_FORM_DESCRIPTOR,
  ],
  gameId: GAME_IDS.hoi4,
  localeResources: HOI4_LOCALE_RESOURCES,
  recognizers: [CHARACTER_RECOGNIZER, EQUIPMENT_RECOGNIZER, MODULE_RECOGNIZER],
};
