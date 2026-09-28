import type { IpcChannelResult } from '@zmt/contracts';
import type { WindowApi } from '@zmt/renderer/core';

import { Service } from '@angular/core';

@Service()
export class PluginService {
  private get api(): WindowApi {
    return window.api;
  }

  list(): Promise<IpcChannelResult<'plugins:list'>> {
    return this.api.plugins.list();
  }
}
