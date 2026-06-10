import { EditorView } from '@codemirror/view';
import { createTheme, ThemeProvider } from '@mui/material';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { ModalContextProvider } from '../../../shared/modal';
import { ModalContextValue } from '../../../shared/modal/modal.model';
import { PlainEditor } from './plain-editor.component';

const theme = createTheme();

const readTextFile = vi.fn<(path: string) => Promise<string>>();
const writeTextFile = vi.fn<(path: string, content: string) => Promise<void>>();

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

function renderEditor(node: ReactNode, modal: ModalContextValue) {
  const router = createMemoryRouter([
    { element: node, path: '/' },
    { element: <div>other page</div>, path: '/other' },
  ]);
  return render(
    <ThemeProvider theme={theme}>
      <ModalContextProvider value={modal}>
        <RouterProvider router={router} />
      </ModalContextProvider>
    </ThemeProvider>,
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
});
