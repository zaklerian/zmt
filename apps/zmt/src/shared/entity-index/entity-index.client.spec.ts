import type { AppApiModel } from '@contracts';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { entityIndexClient } from './entity-index.client';

const detail = vi.fn();
const list = vi.fn();

function installApiMock(): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { index: { detail, list } } as unknown as AppApiModel,
    writable: true,
  });
}

describe('entityIndexClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('list delegates to the index:list channel and returns its result', async () => {
    const result = { rows: [], sources: {} };
    list.mockResolvedValue(result);
    installApiMock();

    await expect(entityIndexClient.list('technology')).resolves.toBe(result);
    expect(list).toHaveBeenCalledWith('technology');
  });

  it('detail delegates to the index:detail channel with the id', async () => {
    const detailResult = { entity: { token: 'fighter1' }, id: 'fighter1' };
    detail.mockResolvedValue(detailResult);
    installApiMock();

    await expect(
      entityIndexClient.detail('technology', 'fighter1'),
    ).resolves.toBe(detailResult);
    expect(detail).toHaveBeenCalledWith('technology', 'fighter1');
  });

  it('propagates a rejection (e.g. a NOT_FOUND IpcError) unchanged', async () => {
    const error = { code: 404, message: 'not found' };
    detail.mockRejectedValue(error);
    installApiMock();

    await expect(
      entityIndexClient.detail('technology', 'missing'),
    ).rejects.toBe(error);
  });
});
