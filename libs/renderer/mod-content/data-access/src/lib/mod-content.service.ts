import type { IpcChannelResult, IpcRequest } from '@zmt/contracts';
import type { WindowApi } from '@zmt/renderer/window-api/util';

import { Service } from '@angular/core';

@Service()
export class ModContentService {
  private get api(): WindowApi {
    return window.api;
  }

  listDirectory(
    request: IpcRequest<'fs:listDirectory'>,
  ): Promise<IpcChannelResult<'fs:listDirectory'>> {
    return this.api.fs.listDirectory(request);
  }

  readTextFile(
    request: IpcRequest<'fs:readTextFile'>,
  ): Promise<IpcChannelResult<'fs:readTextFile'>> {
    return this.api.fs.readTextFile(request);
  }

  searchFiles(request: IpcRequest<'fs:searchFiles'>): Promise<IpcChannelResult<'fs:searchFiles'>> {
    return this.api.fs.searchFiles(request);
  }

  writeTextFile(
    request: IpcRequest<'fs:writeTextFile'>,
  ): Promise<IpcChannelResult<'fs:writeTextFile'>> {
    return this.api.fs.writeTextFile(request);
  }
}
