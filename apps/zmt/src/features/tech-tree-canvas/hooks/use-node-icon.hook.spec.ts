import type { AssetImageResult } from '@contracts';

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assetImageClient } from '../../../shared/asset-image';
import { useNodeIcon } from './use-node-icon.hook';

describe('useNodeIcon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts loading, then holds the ok result with its data URL', async () => {
    const ok: AssetImageResult = {
      dataUrl: 'data:image/png;base64,AAA',
      status: 'ok',
    };
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue(ok);

    const { result } = renderHook(() => useNodeIcon('GFX_fighter1_medium'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current).toEqual(ok);
  });

  it('surfaces unresolved for a no-icon sprite (fallback path, not a crash)', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      status: 'unresolved',
    });

    const { result } = renderHook(() => useNodeIcon('GFX_cv_fighter1_medium'));

    await waitFor(() => expect(result.current.status).toBe('unresolved'));
  });

  it('collapses a rejected IPC call to unresolved', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useNodeIcon('GFX_fighter1_medium'));

    await waitFor(() => expect(result.current.status).toBe('unresolved'));
  });
});
