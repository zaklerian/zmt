import { EditorView } from '@codemirror/view';
import { createTheme, ThemeProvider } from '@mui/material';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ShellContextProvider,
  ShellContextValue,
} from '../../../app/shell/shell-context';
import { useEditGuard } from '../../../app/shell/use-edit-guard.hook';
import { initI18n } from '../../../i18n';
import { ModalContextProvider } from '../../../shared/modal';
import { ModalContextValue } from '../../../shared/modal/modal.model';
import { PlainEditor } from './plain-editor.component';

const theme = createTheme();

const readTextFile = vi.fn<(path: string) => Promise<string>>();
const writeTextFile = vi.fn<(path: string, content: string) => Promise<void>>();

// Drives the real shell gate across a route change: the gate prompts once,
// signals the one-shot leave-confirmed flag, then navigates. The mounted
// editor's useBlocker must consume that flag instead of re-prompting (ZMT-E8.1).
// "leave directly" bypasses the gate to prove the blocker still guards an
// unrelated navigation once the flag is cleared/never set.
function CrossRouteGateHarness() {
  const navigate = useNavigate();
  const {
    confirmLeaveIfDirty,
    consumeLeaveConfirmed,
    registerEditGuard,
    signalLeaveConfirmed,
  } = useEditGuard();
  const shell = makeShell({
    confirmLeaveIfDirty,
    consumeLeaveConfirmed,
    registerEditGuard,
    selectedPath: '/mods/a/notes.txt',
    signalLeaveConfirmed,
  });

  return (
    <ShellContextProvider value={shell}>
      <PlainEditor filePath="/mods/a/notes.txt" writable />
      <button
        type="button"
        onClick={() =>
          void (async () => {
            if (await confirmLeaveIfDirty()) {
              signalLeaveConfirmed();
              void navigate('/mod/info');
            }
          })()
        }
      >
        select mod root
      </button>
      <button type="button" onClick={() => void navigate('/other')}>
        leave directly
      </button>
    </ShellContextProvider>
  );
}

function editorView(container: HTMLElement): EditorView {
  const content = container.querySelector('.cm-content');
  if (content === null) throw new Error('editor content not mounted');
  const view = EditorView.findFromDOM(content as HTMLElement);
  if (view === null) throw new Error('editor view not found');
  return view;
}

function Harness({ writable }: { writable: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      <PlainEditor filePath="/mods/a/notes.txt" writable={writable} />
      <button type="button" onClick={() => void navigate('/other')}>
        leave
      </button>
    </>
  );
}

function installApiMock(): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { fs: { readTextFile, writeTextFile } },
    writable: true,
  });
}

function makeModal(confirmResult: boolean): ModalContextValue {
  return {
    confirm: vi.fn().mockResolvedValue(confirmResult),
    info: vi.fn().mockResolvedValue(undefined),
  };
}

function makeShell(overrides?: Partial<ShellContextValue>): ShellContextValue {
  return {
    activeModRootPath: null,
    confirmLeaveIfDirty: () => Promise.resolve(true),
    consumeLeaveConfirmed: () => false,
    registerEditGuard: () => () => undefined,
    selectedPath: null,
    selectedSupport: null,
    setViewMode: () => undefined,
    signalLeaveConfirmed: () => undefined,
    viewMode: 'code',
    ...overrides,
  };
}

function renderEditor(
  node: ReactNode,
  modal: ModalContextValue,
  shell: ShellContextValue = makeShell(),
) {
  const router = createMemoryRouter([
    {
      element: (
        <ShellContextProvider value={shell}>{node}</ShellContextProvider>
      ),
      path: '/',
    },
    { element: <div>other page</div>, path: '/other' },
    { element: <div>mod info page</div>, path: '/mod/info' },
  ]);
  return render(
    <ThemeProvider theme={theme}>
      <ModalContextProvider value={modal}>
        <RouterProvider router={router} />
      </ModalContextProvider>
    </ThemeProvider>,
  );
}

// Drives the real shell gate: the mounted editor publishes its dirty-predicate
// through useEditGuard and the gate consults it before swapping the file, the
// same single-slot path AppShell.handleSelect takes for an intra-route swap.
function SelectionGateHarness() {
  const [filePath, setFilePath] = useState('/mods/a/first.txt');
  const { confirmLeaveIfDirty, registerEditGuard } = useEditGuard();
  const shell = makeShell({
    confirmLeaveIfDirty,
    registerEditGuard,
    selectedPath: filePath,
  });

  return (
    <ShellContextProvider value={shell}>
      <PlainEditor filePath={filePath} writable />
      <button
        type="button"
        onClick={() =>
          void (async () => {
            if (await confirmLeaveIfDirty()) setFilePath('/mods/a/second.txt');
          })()
        }
      >
        select second
      </button>
    </ShellContextProvider>
  );
}

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    disconnect(): void {
      // no-op: jsdom has no layout engine
    }
    observe(): void {
      // no-op: jsdom has no layout engine
    }
    unobserve(): void {
      // no-op: jsdom has no layout engine
    }
  };
  await initI18n('en');
});

beforeEach(() => {
  installApiMock();
  readTextFile.mockReset();
  writeTextFile.mockReset();
  writeTextFile.mockResolvedValue(undefined);
});

describe('PlainEditor', () => {
  it('loads and renders the file text', async () => {
    readTextFile.mockResolvedValue('hello world');
    renderEditor(
      <PlainEditor filePath="/mods/a/notes.txt" writable={false} />,
      makeModal(false),
    );

    expect(await screen.findByText('hello world')).toBeInTheDocument();
    expect(readTextFile).toHaveBeenCalledWith('/mods/a/notes.txt');
  });

  it('is editable with a Save control on a writable source', async () => {
    readTextFile.mockResolvedValue('hello');
    const { container } = renderEditor(
      <PlainEditor filePath="/mods/a/notes.txt" writable />,
      makeModal(false),
    );

    await screen.findByText('hello');
    expect(container.querySelector('.cm-content')).toHaveAttribute(
      'contenteditable',
      'true',
    );

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '!' } });
    });

    expect(save).toBeEnabled();
    save.click();

    await waitFor(() =>
      expect(writeTextFile).toHaveBeenCalledWith('/mods/a/notes.txt', 'hello!'),
    );
  });

  it('reverts the buffer to the saved text when Cancel is clicked', async () => {
    readTextFile.mockResolvedValue('hello');
    const { container } = renderEditor(
      <PlainEditor filePath="/mods/a/notes.txt" writable />,
      makeModal(false),
    );

    await screen.findByText('hello');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(cancel).toBeDisabled();
    expect(save).toBeDisabled();

    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '!' } });
    });

    expect(cancel).toBeEnabled();
    expect(within(container).getByText('hello!')).toBeInTheDocument();

    act(() => {
      cancel.click();
    });

    expect(within(container).getByText('hello')).toBeInTheDocument();
    expect(within(container).queryByText('hello!')).not.toBeInTheDocument();
    expect(cancel).toBeDisabled();
    expect(save).toBeDisabled();
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it('is view-only with no Save control on a readonly source', async () => {
    readTextFile.mockResolvedValue('vanilla text');
    const { container } = renderEditor(
      <PlainEditor filePath="/mods/a/notes.txt" writable={false} />,
      makeModal(false),
    );

    await screen.findByText('vanilla text');
    expect(container.querySelector('.cm-content')).toHaveAttribute(
      'contenteditable',
      'false',
    );
    expect(
      screen.queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the buffer when the discard prompt is cancelled', async () => {
    readTextFile.mockResolvedValue('draft');
    const modal = makeModal(false);
    const { container } = renderEditor(<Harness writable />, modal);

    await screen.findByText('draft');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: 'X' } });
    });

    screen.getByRole('button', { name: 'leave' }).click();

    await waitFor(() => expect(modal.confirm).toHaveBeenCalled());
    expect(screen.queryByText('other page')).not.toBeInTheDocument();
    expect(within(container).getByText('draftX')).toBeInTheDocument();
  });

  it('discards and navigates when the discard prompt is confirmed', async () => {
    readTextFile.mockResolvedValue('draft');
    const modal = makeModal(true);
    const { container } = renderEditor(<Harness writable />, modal);

    await screen.findByText('draft');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: 'X' } });
    });

    screen.getByRole('button', { name: 'leave' }).click();

    expect(await screen.findByText('other page')).toBeInTheDocument();
  });

  it('keeps the dirty buffer when a same-route file swap is declined', async () => {
    readTextFile.mockImplementation((path) =>
      Promise.resolve(
        path === '/mods/a/first.txt' ? 'first body' : 'second body',
      ),
    );
    const modal = makeModal(false);
    const { container } = renderEditor(<SelectionGateHarness />, modal);

    await screen.findByText('first body');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '!' } });
    });

    screen.getByRole('button', { name: 'select second' }).click();

    await waitFor(() => expect(modal.confirm).toHaveBeenCalled());
    expect(within(container).getByText('first body!')).toBeInTheDocument();
    expect(screen.queryByText('second body')).not.toBeInTheDocument();
  });

  it('swaps the buffer when a same-route file swap is confirmed', async () => {
    readTextFile.mockImplementation((path) =>
      Promise.resolve(
        path === '/mods/a/first.txt' ? 'first body' : 'second body',
      ),
    );
    const modal = makeModal(true);
    const { container } = renderEditor(<SelectionGateHarness />, modal);

    await screen.findByText('first body');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '!' } });
    });

    screen.getByRole('button', { name: 'select second' }).click();

    await waitFor(() => expect(modal.confirm).toHaveBeenCalled());
    expect(await screen.findByText('second body')).toBeInTheDocument();
  });

  it('prompts exactly once when a confirmed dirty selection also changes route', async () => {
    readTextFile.mockResolvedValue('draft');
    const modal = makeModal(true);
    const { container } = renderEditor(<CrossRouteGateHarness />, modal);

    await screen.findByText('draft');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: 'X' } });
    });

    screen.getByRole('button', { name: 'select mod root' }).click();

    expect(await screen.findByText('mod info page')).toBeInTheDocument();
    expect(modal.confirm).toHaveBeenCalledTimes(1);
  });

  it('keeps the buffer on a declined cross-route selection and still guards a later navigation', async () => {
    readTextFile.mockResolvedValue('draft');
    const modal = makeModal(false);
    const { container } = renderEditor(<CrossRouteGateHarness />, modal);

    await screen.findByText('draft');
    act(() => {
      const view = editorView(container);
      view.dispatch({ changes: { from: view.state.doc.length, insert: 'X' } });
    });

    screen.getByRole('button', { name: 'select mod root' }).click();

    await waitFor(() => expect(modal.confirm).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('mod info page')).not.toBeInTheDocument();
    expect(within(container).getByText('draftX')).toBeInTheDocument();

    // Decline never set the flag, so the blocker still guards an unrelated
    // navigation — a second prompt fires.
    screen.getByRole('button', { name: 'leave directly' }).click();

    await waitFor(() => expect(modal.confirm).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('other page')).not.toBeInTheDocument();
    expect(within(container).getByText('draftX')).toBeInTheDocument();
  });
});
