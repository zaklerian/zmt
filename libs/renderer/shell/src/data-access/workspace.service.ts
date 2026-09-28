import type { IpcChannelResult } from '@zmt/contracts';
import type { WindowApi } from '@zmt/renderer/core';

import { Service } from '@angular/core';

@Service()
export class WorkspaceService {
  private get api(): WindowApi {
    return window.api;
  }

  openFolderDialog(): Promise<IpcChannelResult<'fs:openFolderDialog'>> {
    return this.api.fs.openFolderDialog();
  }
}
