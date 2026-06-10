import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useContentViewMode } from './use-content-view-mode.hook';

describe('useContentViewMode', () => {
  it('defaults to the table view', () => {
    const { result } = renderHook(() => useContentViewMode('/mods/a/file.txt'));
    expect(result.current.viewMode).toBe('table');
  });

  it('holds the chosen mode while the selected file is unchanged', () => {
    const { rerender, result } = renderHook(
      ({ path }) => useContentViewMode(path),
      { initialProps: { path: '/mods/a/file.txt' } },
    );

    act(() => result.current.setViewMode('code'));
    expect(result.current.viewMode).toBe('code');

    rerender({ path: '/mods/a/file.txt' });
    expect(result.current.viewMode).toBe('code');
  });

  it('resets to the table view when the selected file changes', () => {
    const { rerender, result } = renderHook(
      ({ path }) => useContentViewMode(path),
      { initialProps: { path: '/mods/a/file.txt' } },
    );

    act(() => result.current.setViewMode('code'));
    expect(result.current.viewMode).toBe('code');

    rerender({ path: '/mods/a/other.txt' });
    expect(result.current.viewMode).toBe('table');
  });
});
