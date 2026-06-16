import { TechnologyEntity } from '@contracts';

// Technologies carry no domain or category ordering; order by token, the stable
// identifier that also titles the edit dialog.
export function compareTechnologyEntities(
  a: TechnologyEntity,
  b: TechnologyEntity,
): number {
  return a.token.localeCompare(b.token);
}
