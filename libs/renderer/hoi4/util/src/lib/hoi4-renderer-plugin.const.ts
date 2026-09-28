import type { RendererPlugin } from '@zmt/renderer/plugin/util';

import { GAME_IDS } from '@zmt/contracts';

import { HOI4_FORM_DESCRIPTORS } from './hoi4-form-descriptor.const';
import { HOI4_RECOGNIZERS } from './hoi4-recognizer.const';

export const HOI4_RENDERER_PLUGIN: RendererPlugin = {
  formDescriptors: HOI4_FORM_DESCRIPTORS,
  gameId: GAME_IDS.hoi4,
  recognizers: HOI4_RECOGNIZERS,
};
