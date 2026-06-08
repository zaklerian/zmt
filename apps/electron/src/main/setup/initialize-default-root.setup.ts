import { promises as fs } from 'node:fs';

import { workspaceStoreService } from '../workspace';

export async function initializeDefaultRoot(): Promise<void> {
  if (!process.env.ZMT_RENDERER_URL) return;
  const envPath = process.env.ZMT_DEFAULT_MODS_PATH;
  if (!envPath) return;
  if (workspaceStoreService.get().openMods.length > 0) return;

  try {
    const stat = await fs.stat(envPath);
    if (stat.isDirectory()) {
      workspaceStoreService.openMod(envPath);
    }
  } catch {
    return;
  }
}
