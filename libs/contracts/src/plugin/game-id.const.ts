export const GAME_IDS = {
  hoi4: 'hoi4',
  stellaris: 'stellaris',
  v3: 'v3',
} as const satisfies Record<string, string>;

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS];
