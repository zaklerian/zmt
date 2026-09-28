import { GAME_IDS, type GamePlugin } from '@zmt/contracts';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { createPluginRegistry, registerPlugins } from './plugin-registry.service';

const HOI4: GamePlugin = { displayName: 'Hearts of Iron IV', features: [], gameId: GAME_IDS.hoi4 };
const STELLARIS: GamePlugin = {
  displayName: 'Stellaris',
  features: [],
  gameId: GAME_IDS.stellaris,
};

describe('createPluginRegistry', () => {
  it('starts empty and returns null for unknown games', () => {
    const registry = createPluginRegistry();
    expect(registry.list()).toEqual([]);
    expect(registry.get(GAME_IDS.hoi4)).toBeNull();
  });

  it('registers plugins and lists them in registration order', () => {
    const registry = createPluginRegistry();
    registry.register(STELLARIS);
    registry.register(HOI4);
    expect(registry.list()).toEqual([STELLARIS, HOI4]);
    expect(registry.get(GAME_IDS.hoi4)).toBe(HOI4);
  });

  it('rejects a second plugin for the same game with 409', () => {
    const registry = createPluginRegistry();
    registry.register(HOI4);
    expect(() => {
      registry.register({ ...HOI4, displayName: 'Other' });
    }).toThrow(IpcFailure);
    expect(() => {
      registry.register(HOI4);
    }).toThrow(expect.objectContaining({ code: 409 }) as Error);
    expect(registry.list()).toEqual([HOI4]);
  });

  it('returns a fresh list each time', () => {
    const registry = createPluginRegistry();
    registry.register(HOI4);
    expect(registry.list()).not.toBe(registry.list());
    expect(Object.isFrozen(registry)).toBe(true);
  });
});

describe('registerPlugins', () => {
  it('registers every plugin in order', () => {
    const registry = createPluginRegistry();
    registerPlugins(registry, [HOI4, STELLARIS]);
    expect(registry.list()).toEqual([HOI4, STELLARIS]);
  });
});
