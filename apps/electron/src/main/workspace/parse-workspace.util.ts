import { OpenMod, Workspace } from '@contracts';

const EMPTY_WORKSPACE: Workspace = { openMods: [] };

export function parseWorkspace(raw: unknown): Workspace {
  if (!isRecord(raw) || !Array.isArray(raw.openMods)) {
    return EMPTY_WORKSPACE;
  }

  const openMods: OpenMod[] = [];
  for (const candidate of raw.openMods) {
    if (!isOpenMod(candidate)) {
      return EMPTY_WORKSPACE;
    }
    openMods.push({
      id: candidate.id,
      name: candidate.name,
      path: candidate.path,
      permission: 'editable',
    });
  }

  return { openMods };
}

function isOpenMod(value: unknown): value is OpenMod {
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
