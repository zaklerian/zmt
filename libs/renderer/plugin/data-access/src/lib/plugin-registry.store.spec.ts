import type { RendererPlugin } from '@zmt/renderer/plugin/util';

import { TestBed } from '@angular/core/testing';
import { ok } from '@zmt/contracts';
import { HOI4_ENTITY_ID_LIST, HOI4_RENDERER_PLUGIN } from '@zmt/renderer/hoi4/util';

import { PluginRegistryStore } from './plugin-registry.store';

const STELLARIS: RendererPlugin = {
  formDescriptors: [
    {
      entityId: 'stellaris-ship',
      gameId: 'stellaris',
      project: () => ({
        blocks: [],
        errorMessage: () => 'failed',
        errorTitle: 'Save failed',
        save: () => Promise.resolve(ok(null)),
      }),
    },
  ],
  gameId: 'stellaris',
  recognizers: [
    {
      id: 'stellaris-ship',
      load: () => Promise.resolve(ok({ actions: [], columns: [], defaultSort: [], rows: [] })),
      matches: (filePath) => filePath.endsWith('/ships.txt'),
    },
  ],
};

describe('PluginRegistryStore', () => {
  let store: InstanceType<typeof PluginRegistryStore>;

  beforeEach(() => {
    store = TestBed.inject(PluginRegistryStore);
  });

  it('starts with the hoi4 renderer plugin and flattens its contributions', () => {
    expect(store.plugins()).toEqual([HOI4_RENDERER_PLUGIN]);
    expect(store.recognizers().map((recognizer) => recognizer.id)).toEqual(HOI4_ENTITY_ID_LIST);
    expect(store.formDescriptors().map((descriptor) => descriptor.entityId)).toEqual(
      HOI4_ENTITY_ID_LIST,
    );
  });

  it('recognises a file through the first matching recognizer', () => {
    expect(store.recognize('/mod/common/technologies/air.txt')?.id).toBe('hoi4-technology');
    expect(store.recognize('/mod/common/units/equipment/planes.txt')?.id).toBe('hoi4-equipment');
    expect(store.recognize('/mod/readme.txt')).toBeNull();
  });

  it('registers a plugin once per game and resolves its descriptors', () => {
    store.register(STELLARIS);
    expect(store.plugins().map((plugin) => plugin.gameId)).toEqual(['hoi4', 'stellaris']);
    store.register({ ...STELLARIS, formDescriptors: [] });
    expect(store.plugins().map((plugin) => plugin.gameId)).toEqual(['hoi4', 'stellaris']);
    expect(store.formDescriptors().some((d) => d.entityId === 'stellaris-ship')).toBe(false);

    store.register(STELLARIS);
    expect(store.recognize('/mod/common/ships.txt')?.id).toBe('stellaris-ship');
    expect(store.resolveFormDescriptor('stellaris', 'stellaris-ship')?.entityId).toBe(
      'stellaris-ship',
    );
    expect(store.resolveFormDescriptor('hoi4', 'hoi4-technology')?.entityId).toBe(
      'hoi4-technology',
    );
    expect(store.resolveFormDescriptor('hoi4', 'stellaris-ship')).toBeNull();
    expect(store.resolveFormDescriptor('v3', 'hoi4-technology')).toBeNull();
  });
});
