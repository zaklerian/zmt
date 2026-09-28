import { TestBed } from '@angular/core/testing';
import { ok } from '@zmt/contracts';

import { PluginService } from './plugin.service';

describe('PluginService', () => {
  const list = vi.fn();

  beforeEach(() => {
    list.mockReset();
    Object.defineProperty(window, 'api', { configurable: true, value: { plugins: { list } } });
  });

  it('passes the plugin list envelope through unchanged', async () => {
    const result = ok([
      { displayName: 'Hearts of Iron IV', features: [], gameId: 'hoi4' as const },
    ]);
    list.mockResolvedValue(result);
    await expect(TestBed.inject(PluginService).list()).resolves.toBe(result);
    expect(list).toHaveBeenCalledWith();
  });
});
