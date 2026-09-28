import { FEATURE_IDS, GAME_IDS, GAME_PLUGIN_LIST_SCHEMA } from '@zmt/contracts';
import * as v from 'valibot';

import { HOI4_PLUGIN } from './hoi4-plugin.const';
import { KNOWN_PLUGINS } from './known-plugins.const';

describe('KNOWN_PLUGINS', () => {
  it('ships the Hearts of Iron IV plugin only', () => {
    expect(KNOWN_PLUGINS).toEqual([HOI4_PLUGIN]);
  });

  it('satisfies the plugin contract', () => {
    expect(v.parse(GAME_PLUGIN_LIST_SCHEMA, KNOWN_PLUGINS)).toEqual(KNOWN_PLUGINS);
  });
});

describe('HOI4_PLUGIN', () => {
  it('contributes the aircraft feature, enabled by default', () => {
    expect(HOI4_PLUGIN.gameId).toBe(GAME_IDS.hoi4);
    expect(HOI4_PLUGIN.displayName).toBe('Hearts of Iron IV');
    const aircraft = HOI4_PLUGIN.features.find(
      (feature) => feature.featureId === FEATURE_IDS.aircraft,
    );
    expect(aircraft).toEqual({ enabled: true, featureId: 'aircraft', label: 'Aircraft' });
  });

  it('does not expose traits or research as features', () => {
    const ids = HOI4_PLUGIN.features.map((feature) => feature.featureId);
    expect(ids).toEqual(['aircraft']);
  });
});
