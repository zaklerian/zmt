import { promises as fs } from 'node:fs';

import { rootStateService } from '../fs';

export async function initializeDefaultRoot(): Promise<void> {
  if (!process.env.ZMT_RENDERER_URL) return;
  const envPath = process.env.ZMT_DEFAULT_MODS_PATH;
  if (!envPath) return;

  try {
    const stat = await fs.stat(envPath);
    if (stat.isDirectory()) {
      rootStateService.set(envPath);
    }
  } catch {
    return;
  }
}
