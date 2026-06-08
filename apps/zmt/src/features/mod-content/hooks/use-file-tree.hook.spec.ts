import { FsNode } from '@contracts';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { modContentService } from '../services/mod-content.service';
import { useFileTree } from './use-file-tree.hook';

function node(name: string): FsNode {
  return { extension: 'file', name, path: `/${name}` } as FsNode;
}

describe('useFileTree', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a stale root fetch when two resets land in the same tick', async () => {
    let resolveStale: (nodes: readonly FsNode[]) => void = () => undefined;
    let resolveFresh: (nodes: readonly FsNode[]) => void = () => undefined;
    const stale = [node('stale')];
    const fresh = [node('fresh')];

    const listDirectory = vi
      .spyOn(modContentService, 'listDirectory')
      .mockImplementationOnce(
        () => new Promise<readonly FsNode[]>((r) => (resolveStale = r)),
      )
      .mockImplementationOnce(
        () => new Promise<readonly FsNode[]>((r) => (resolveFresh = r)),
      );

    // Two roots changing within the same synchronous batch: the first
    // (stale) fetch must never be accepted once the second supersedes it.
    // A Date.now() fetchId collides here; a monotonic counter does not.
    const { rerender, result } = renderHook(
      ({ root }) => useFileTree({ root }),
      {
        initialProps: { root: '/a' },
      },
    );
    rerender({ root: '/b' });

    expect(listDirectory).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFresh(fresh);
      resolveStale(stale);
    });

    await waitFor(() => expect(result.current.loadingRoot).toBe(false));
    expect(result.current.rootChildren).toEqual(fresh);
  });
});
