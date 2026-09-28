import { TestBed } from '@angular/core/testing';
import { fail, ok } from '@zmt/contracts';

import { ModInfoService } from './mod-info.service';

describe('ModInfoService', () => {
  const fs = { readTextFile: vi.fn(), writeTextFile: vi.fn() };

  beforeEach(() => {
    fs.readTextFile.mockReset();
    fs.writeTextFile.mockReset();
    Object.defineProperty(window, 'api', { configurable: true, value: { fs } });
  });

  it('reads the descriptor over fs:readTextFile and passes the envelope through', async () => {
    const result = ok('name = "My mod"');
    fs.readTextFile.mockResolvedValue(result);
    await expect(
      TestBed.inject(ModInfoService).readDescriptor('/mod/descriptor.mod'),
    ).resolves.toBe(result);
    expect(fs.readTextFile).toHaveBeenCalledWith({ path: '/mod/descriptor.mod' });
  });

  it('writes the descriptor over fs:writeTextFile and passes a failure through', async () => {
    const result = fail(409, 'changed on disk');
    fs.writeTextFile.mockResolvedValue(result);
    await expect(
      TestBed.inject(ModInfoService).writeDescriptor('/mod/descriptor.mod', 'version = "2"'),
    ).resolves.toBe(result);
    expect(fs.writeTextFile).toHaveBeenCalledWith({
      content: 'version = "2"',
      path: '/mod/descriptor.mod',
    });
  });
});
