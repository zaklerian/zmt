import { NotImplementedError } from '@zmt/renderer/pending/util';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { HOI4_ENTITY_ID_LIST } from './hoi4-entity-id.const';
import { HOI4_RENDERER_PLUGIN } from './hoi4-renderer-plugin.const';

describe('HOI4_RENDERER_PLUGIN', () => {
  it('contributes one recognizer and one form descriptor per entity, keyed alike', () => {
    expect(HOI4_RENDERER_PLUGIN.gameId).toBe('hoi4');
    expect(HOI4_RENDERER_PLUGIN.recognizers.map((recognizer) => recognizer.id)).toEqual(
      HOI4_ENTITY_ID_LIST,
    );
    expect(HOI4_RENDERER_PLUGIN.formDescriptors.map((descriptor) => descriptor.entityId)).toEqual(
      HOI4_ENTITY_ID_LIST,
    );
    expect(new Set(HOI4_ENTITY_ID_LIST).size).toBe(6);
  });

  it('declares every recognizer and descriptor body as pending', () => {
    for (const recognizer of HOI4_RENDERER_PLUGIN.recognizers) {
      expect(() => recognizer.matches('common/technologies/air.txt')).toThrow(NotImplementedError);
      expect(() => recognizer.load('common/technologies/air.txt', EN_MESSAGES)).toThrow(
        NotImplementedError,
      );
    }
    for (const descriptor of HOI4_RENDERER_PLUGIN.formDescriptors) {
      expect(descriptor.gameId).toBe('hoi4');
      expect(() =>
        descriptor.project({}, { filePath: '/mod/a.txt', messages: EN_MESSAGES, mode: 'edit' }),
      ).toThrow(NotImplementedError);
    }
  });
});
