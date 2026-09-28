import { ok } from '@zmt/contracts';

import type { WindowApi } from './window-api.model';

describe('WindowApi', () => {
  it('is the contract api shape keyed by channel group', async () => {
    const api: WindowApi = {
      fs: {
        listDirectory: () => Promise.resolve(ok([])),
        openFolderDialog: () => Promise.resolve(ok(null)),
        readTextFile: () => Promise.resolve(ok('')),
        searchFiles: () => Promise.resolve(ok([])),
        writeBinaryFile: () => Promise.resolve(ok(null)),
        writeTextFile: () => Promise.resolve(ok(null)),
      },
      plugins: { list: () => Promise.resolve(ok([])) },
      system: { ping: () => Promise.resolve(ok('pong')) },
    };
    expect(Object.keys(api).sort()).toEqual(['fs', 'plugins', 'system']);
    await expect(api.system.ping()).resolves.toEqual({ data: 'pong', ok: true });
  });
});
