import { TestBed } from '@angular/core/testing';
import { fail, ok } from '@zmt/contracts';

import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  const openFolderDialog = vi.fn();

  beforeEach(() => {
    openFolderDialog.mockReset();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { fs: { openFolderDialog } },
    });
  });

  it('passes the folder dialog result envelope through unchanged', async () => {
    const result = ok('/mods/my-mod');
    openFolderDialog.mockResolvedValue(result);
    await expect(TestBed.inject(WorkspaceService).openFolderDialog()).resolves.toBe(result);
    expect(openFolderDialog).toHaveBeenCalledWith();
  });

  it('passes a failure envelope through unchanged', async () => {
    const result = fail(403, 'denied');
    openFolderDialog.mockResolvedValue(result);
    await expect(TestBed.inject(WorkspaceService).openFolderDialog()).resolves.toBe(result);
  });
});
