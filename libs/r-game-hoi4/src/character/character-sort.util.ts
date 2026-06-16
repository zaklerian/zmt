import { CharacterEntity } from '@contracts';

// Characters carry no domain or category; order by token, the stable identifier
// that also titles the edit dialog.
export function compareCharacterEntities(
  a: CharacterEntity,
  b: CharacterEntity,
): number {
  return a.token.localeCompare(b.token);
}
