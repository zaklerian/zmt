import * as v from 'valibot';

import {
  FEATURE_CONTRIBUTION_SCHEMA,
  FEATURE_ID_SCHEMA,
  FEATURE_IDS,
  GAME_ID_SCHEMA,
  GAME_IDS,
  GAME_PLUGIN_LIST_SCHEMA,
  GAME_PLUGIN_SCHEMA,
} from './game-plugin.schema';

const PLUGIN = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: FEATURE_IDS.aircraft, label: 'Aircraft' }],
  gameId: GAME_IDS.hoi4,
};

describe('GAME_PLUGIN_SCHEMA', () => {
  it('parses a plugin with features', () => {
    expect(v.parse(GAME_PLUGIN_SCHEMA, PLUGIN)).toEqual(PLUGIN);
    expect(v.parse(GAME_PLUGIN_SCHEMA, { ...PLUGIN, features: [] }).features).toEqual([]);
  });

  it('drops fields the contract does not declare', () => {
    const parsed = v.parse(GAME_PLUGIN_SCHEMA, { ...PLUGIN, parserExtension: { dialects: [] } });
    expect(parsed).toEqual(PLUGIN);
  });

  it.each([
    [{ ...PLUGIN, gameId: 'ck3' }],
    [{ ...PLUGIN, displayName: '' }],
    [{ ...PLUGIN, features: [{ enabled: true, featureId: 'research', label: 'Research' }] }],
    [{ ...PLUGIN, features: [{ enabled: 'yes', featureId: 'aircraft', label: 'Aircraft' }] }],
    [{ ...PLUGIN, features: [{ enabled: true, featureId: 'aircraft', label: '' }] }],
    [{ displayName: 'x', gameId: 'hoi4' }],
  ])('rejects %j', (value) => {
    expect(v.safeParse(GAME_PLUGIN_SCHEMA, value).success).toBe(false);
  });

  it('closes the game and feature id sets', () => {
    expect(Object.values(GAME_IDS)).toEqual(['hoi4', 'stellaris', 'v3']);
    expect(Object.values(FEATURE_IDS)).toEqual(['aircraft', 'traits']);
    expect(v.safeParse(GAME_ID_SCHEMA, 'eu4').success).toBe(false);
    expect(v.safeParse(FEATURE_ID_SCHEMA, 'navy').success).toBe(false);
    expect(v.parse(FEATURE_CONTRIBUTION_SCHEMA, PLUGIN.features[0])).toEqual(PLUGIN.features[0]);
  });

  it('parses a plugin list', () => {
    expect(v.parse(GAME_PLUGIN_LIST_SCHEMA, [PLUGIN])).toEqual([PLUGIN]);
    expect(v.safeParse(GAME_PLUGIN_LIST_SCHEMA, PLUGIN).success).toBe(false);
  });
});
