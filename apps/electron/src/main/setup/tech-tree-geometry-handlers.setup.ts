import type { TechTreeGeometry } from '@contracts';

import { IPC_CHANNELS } from '@contracts';

import { ipcHandle } from '../ipc';
import { techTreeGeometryService } from '../tech-tree-geometry';

export function registerTechTreeGeometryHandlers(): void {
  ipcHandle<TechTreeGeometry>(IPC_CHANNELS.techTreeGeometry.read, async () =>
    techTreeGeometryService.read(),
  );
}
