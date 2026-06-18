import { IdeologyEntity } from '@contracts';

// Ideologies order by their token (the `<ideology>` key) with a stable locale
// compare — the natural, file-agnostic ordering for a small named set.
export function compareIdeologyEntities(
  a: IdeologyEntity,
  b: IdeologyEntity,
): number {
  return a.token.localeCompare(b.token);
}
