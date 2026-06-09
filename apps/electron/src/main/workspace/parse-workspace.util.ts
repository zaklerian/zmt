import { IncludedMod, Workspace } from '@contracts';

const EMPTY_WORKSPACE: Workspace = { includedMods: [] };

export function parseWorkspace(raw: unknown): Workspace {
  if (!isRecord(raw) || !Array.isArray(raw.includedMods)) {
    return EMPTY_WORKSPACE;
  }

  const includedMods: IncludedMod[] = [];
  for (const candidate of raw.includedMods) {
    if (!isIncludedMod(candidate)) {
      return EMPTY_WORKSPACE;
    }
    includedMods.push({
      id: candidate.id,
      name: candidate.name,
      path: candidate.path,
      permission: 'editable',
    });
  }

  return { includedMods };
}

function isIncludedMod(value: unknown): value is IncludedMod {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.path === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
