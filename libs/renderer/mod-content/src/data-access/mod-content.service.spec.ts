import { TestBed } from '@angular/core/testing';
import { fail, ok } from '@zmt/contracts';

import { ModContentService } from './mod-content.service';

describe('ModContentService', () => {
  const fs = {
    listDirectory: vi.fn(),
    readTextFile: vi.fn(),
    searchFiles: vi.fn(),
    writeTextFile: vi.fn(),
  };

  beforeEach(() => {
    for (const method of Object.values(fs)) {
      method.mockReset();
    }
    Object.defineProperty(window, 'api', { configurable: true, value: { fs } });
  });

  it('calls fs:listDirectory with the request and passes the envelope through', async () => {
    const result = ok([]);
    fs.listDirectory.mockResolvedValue(result);
    const request = { options: { hideUnsupportedFiles: true }, path: '/mod' };
    await expect(TestBed.inject(ModContentService).listDirectory(request)).resolves.toBe(result);
    expect(fs.listDirectory).toHaveBeenCalledWith(request);
  });

  it('calls fs:readTextFile with the request and passes the envelope through', async () => {
    const result = ok('text');
    fs.readTextFile.mockResolvedValue(result);
    await expect(
      TestBed.inject(ModContentService).readTextFile({ path: '/mod/a.txt' }),
    ).resolves.toBe(result);
    expect(fs.readTextFile).toHaveBeenCalledWith({ path: '/mod/a.txt' });
  });

  it('calls fs:searchFiles with the request and passes a failure through', async () => {
    const result = fail(403, 'No root folder is open');
    fs.searchFiles.mockResolvedValue(result);
    const request = { query: 'air', root: '/mod' };
    await expect(TestBed.inject(ModContentService).searchFiles(request)).resolves.toBe(result);
    expect(fs.searchFiles).toHaveBeenCalledWith(request);
  });

  it('calls fs:writeTextFile with the request and passes the envelope through', async () => {
    const result = ok(null);
    fs.writeTextFile.mockResolvedValue(result);
    const request = { content: 'x = 1', path: '/mod/a.txt' };
    await expect(TestBed.inject(ModContentService).writeTextFile(request)).resolves.toBe(result);
    expect(fs.writeTextFile).toHaveBeenCalledWith(request);
  });
});
