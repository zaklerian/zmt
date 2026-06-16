import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  plainEditorActions,
  PlainEditorSurfaceContext,
} from './plain-editor-actions';

const writeTextFile = vi.fn<(path: string, content: string) => Promise<void>>();

function installApiMock(): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { fs: { writeTextFile } },
    writable: true,
  });
}

function surface(
  overrides: Partial<PlainEditorSurfaceContext> = {},
): PlainEditorSurfaceContext {
  return {
    dirty: true,
    filePath: '/mods/a/notes.txt',
    getText: () => 'hello',
    onSaved: vi.fn(),
    reset: vi.fn(),
    setSaveError: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  installApiMock();
  writeTextFile.mockReset().mockResolvedValue(undefined);
});

describe('plainEditorActions availability', () => {
  it('gates save and cancel on the dirty slice', () => {
    expect(plainEditorActions.save.isAvailable(surface({ dirty: true }))).toBe(
      true,
    );
    expect(plainEditorActions.save.isAvailable(surface({ dirty: false }))).toBe(
      false,
    );
    expect(
      plainEditorActions.cancel.isAvailable(surface({ dirty: false })),
    ).toBe(false);
    expect(plainEditorActions.retry.isAvailable({ retry: vi.fn() })).toBe(true);
  });
});

describe('plainEditorActions.save execute', () => {
  it('writes the current text and reports saved', async () => {
    const onSaved = vi.fn();
    await plainEditorActions.save.execute(surface({ onSaved }));
    expect(writeTextFile).toHaveBeenCalledWith('/mods/a/notes.txt', 'hello');
    expect(onSaved).toHaveBeenCalledWith('hello');
  });

  it('skips the write when the editor view is gone', async () => {
    await plainEditorActions.save.execute(surface({ getText: () => null }));
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it('surfaces a write error', async () => {
    writeTextFile.mockRejectedValue({ code: 500, message: 'nope' });
    const setSaveError = vi.fn();
    await plainEditorActions.save.execute(surface({ setSaveError }));
    expect(setSaveError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500 }),
    );
  });
});

describe('plainEditorActions cancel/retry', () => {
  it('cancel resets the buffer', () => {
    const reset = vi.fn();
    void plainEditorActions.cancel.execute(surface({ reset }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('retry re-fetches', () => {
    const retry = vi.fn();
    void plainEditorActions.retry.execute({ retry });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
