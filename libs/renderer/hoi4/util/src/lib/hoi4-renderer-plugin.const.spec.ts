import { NotImplementedError } from '@zmt/renderer/pending/util';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { HOI4_ENTITY_ID_LIST, HOI4_ENTITY_IDS } from './hoi4-entity-id.const';
import { HOI4_ENTITY_FOLDERS, matchesEntityFolder } from './hoi4-recognizer.const';
import { HOI4_RENDERER_PLUGIN } from './hoi4-renderer-plugin.const';

const recognizerFor = (id: string) =>
  HOI4_RENDERER_PLUGIN.recognizers.find((recognizer) => recognizer.id === id);

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

  it.each([
    [HOI4_ENTITY_IDS.character, '/mod/common/characters/GER.txt'],
    [HOI4_ENTITY_IDS.equipment, 'C:\\mods\\bice\\common\\units\\equipment\\planes.TXT'],
    [HOI4_ENTITY_IDS.ideology, '/mod/common/ideologies/00_ideologies.txt'],
    [HOI4_ENTITY_IDS.module, '/mod/common/units/equipment/modules/00_plane_modules.txt'],
    [HOI4_ENTITY_IDS.state, '/mod/history/states/1-France.txt'],
    [HOI4_ENTITY_IDS.technology, '/mod/common/technologies/air.txt'],
  ])('%s recognises a script file directly inside its folder', (id, filePath) => {
    expect(recognizerFor(id)?.matches(filePath)).toBe(true);
    for (const other of HOI4_RENDERER_PLUGIN.recognizers) {
      if (other.id !== id) {
        expect(other.matches(filePath)).toBe(false);
      }
    }
  });

  it('rejects files outside the folder, nested deeper or with another extension', () => {
    const technology = recognizerFor(HOI4_ENTITY_IDS.technology);
    expect(technology?.matches('/mod/common/technologies/air.yml')).toBe(false);
    expect(technology?.matches('/mod/common/technologies/sub/air.txt')).toBe(false);
    expect(technology?.matches('/mod/common/technologies_old/air.txt')).toBe(false);
    expect(technology?.matches('common/technologies')).toBe(false);
    expect(technology?.matches('')).toBe(false);
    expect(
      matchesEntityFolder('/x/common/units/equipment_modules/a.txt', HOI4_ENTITY_FOLDERS.equipment),
    ).toBe(false);
    expect(matchesEntityFolder('common/technologies/air.txt', HOI4_ENTITY_FOLDERS.technology)).toBe(
      true,
    );
  });

  it('declares every recognizer loader and descriptor projection as pending', () => {
    for (const recognizer of HOI4_RENDERER_PLUGIN.recognizers) {
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
