import type { IpcChannelResult } from '@zmt/contracts';
import type { WindowApi } from '@zmt/renderer/window-api/util';

import { Service } from '@angular/core';

@Service()
export class ModInfoService {
  private get api(): WindowApi {
    return window.api;
  }

  readDescriptor(path: string): Promise<IpcChannelResult<'fs:readTextFile'>> {
    return this.api.fs.readTextFile({ path });
  }

  writeDescriptor(path: string, content: string): Promise<IpcChannelResult<'fs:writeTextFile'>> {
    return this.api.fs.writeTextFile({ content, path });
  }
}
