import { TestBed } from '@angular/core/testing';
import { HOI4_ENTITY_ID_LIST, HOI4_RENDERER_PLUGIN } from '@zmt/renderer/hoi4/util';
import { NotImplementedError } from '@zmt/renderer/pending/util';

import { PluginRegistryStore } from './plugin-registry.store';

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

  it('declares recognize, register and resolveFormDescriptor as pending', () => {
    expect(() => store.recognize('/mod/common/technologies/air.txt')).toThrow(NotImplementedError);
    expect(() => {
      store.register(HOI4_RENDERER_PLUGIN);
    }).toThrow(NotImplementedError);
    expect(() => store.resolveFormDescriptor('hoi4', 'hoi4-technology')).toThrow(
      NotImplementedError,
    );
  });
});
