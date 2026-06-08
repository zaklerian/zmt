import {
  act,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ModalProvider } from './modal-provider.component';
import { useModal } from './use-modal.hook';

function wrapper({ children }: { children: ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>;
}

describe('useModal context', () => {
  it('throws when used outside ModalProvider', () => {
    expect(() => renderHook(() => useModal())).toThrow(
      /must be used inside its provider/,
    );
  });

  it('returns confirm and info functions when inside ModalProvider', () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    expect(typeof result.current.confirm).toBe('function');
    expect(typeof result.current.info).toBe('function');
  });
});

describe('ModalProvider confirm flow', () => {
  it('opens a dialog with the supplied title and message', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    act(() => {
      void result.current.confirm({
        message: 'Are you sure?',
        title: 'Discard changes',
      });
    });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Discard changes')).toBeInTheDocument();
    expect(within(dialog).getByText('Are you sure?')).toBeInTheDocument();
  });

  it('resolves true when the confirm button is clicked', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    let promise!: Promise<boolean>;
    act(() => {
      promise = result.current.confirm({ message: 'm', title: 't' });
    });
    const dialog = await screen.findByRole('dialog');
    const confirm = await within(dialog).findByRole('button', {
      name: 'Confirm',
    });

    await act(async () => {
      confirm.click();
    });

    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when the cancel button is clicked', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    let promise!: Promise<boolean>;
    act(() => {
      promise = result.current.confirm({ message: 'm', title: 't' });
    });
    const dialog = await screen.findByRole('dialog');
    const cancel = await within(dialog).findByRole('button', {
      name: 'Cancel',
    });

    await act(async () => {
      cancel.click();
    });

    await expect(promise).resolves.toBe(false);
  });

  it('honors custom confirm and cancel labels', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    act(() => {
      void result.current.confirm({
        cancelLabel: 'Stay',
        confirmLabel: 'Discard',
        message: 'm',
        title: 't',
      });
    });
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Discard' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Stay' }),
    ).toBeInTheDocument();
  });
});

describe('ModalProvider info flow', () => {
  it('opens an info dialog with a single confirm button', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    act(() => {
      void result.current.info({ message: 'm', title: 't' });
    });
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Confirm' }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('resolves void when dismissed', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    let promise!: Promise<void>;
    act(() => {
      promise = result.current.info({ message: 'm', title: 't' });
    });
    const dialog = await screen.findByRole('dialog');
    const button = await within(dialog).findByRole('button', {
      name: 'Confirm',
    });
    await act(async () => {
      button.click();
    });
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('ModalProvider single-modal contract', () => {
  it('rejects a second confirm while one is already open', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    act(() => {
      void result.current.confirm({ message: 'a', title: 'A' });
    });
    await screen.findByRole('dialog');

    let captured: unknown = null;
    await act(async () => {
      try {
        await result.current.confirm({ message: 'b', title: 'B' });
      } catch (error: unknown) {
        captured = error;
      }
    });
    expect(captured).toBeInstanceOf(Error);
    expect((captured as Error).message).toBe('Modal already open');
  });

  it('rejects an info call while a confirm is already open', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    act(() => {
      void result.current.confirm({ message: 'a', title: 'A' });
    });
    await screen.findByRole('dialog');

    let captured: unknown = null;
    await act(async () => {
      try {
        await result.current.info({ message: 'b', title: 'B' });
      } catch (error: unknown) {
        captured = error;
      }
    });
    expect(captured).toBeInstanceOf(Error);
    expect((captured as Error).message).toBe('Modal already open');
  });

  it('frees the slot once a modal closes, allowing a follow-up open', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });
    let firstPromise!: Promise<boolean>;
    act(() => {
      firstPromise = result.current.confirm({ message: 'a', title: 'A' });
    });
    const firstDialog = await screen.findByRole('dialog');
    const firstConfirm = await within(firstDialog).findByRole('button', {
      name: 'Confirm',
    });
    await act(async () => {
      firstConfirm.click();
    });
    await firstPromise;
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    let secondPromise!: Promise<boolean>;
    act(() => {
      secondPromise = result.current.confirm({
        message: 'second-message',
        title: 'second-title',
      });
    });
    const secondDialog = await screen.findByRole('dialog');
    expect(within(secondDialog).getByText('second-title')).toBeInTheDocument();
    const secondConfirm = await within(secondDialog).findByRole('button', {
      name: 'Confirm',
    });
    await act(async () => {
      secondConfirm.click();
    });
    await expect(secondPromise).resolves.toBe(true);
  });
});

describe('R-REACT-2 dirty-form guard pattern (confirm as building block)', () => {
  it('returning true from confirm triggers the discard path', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });

    async function attemptClose(isDirty: boolean): Promise<boolean> {
      if (!isDirty) return true;
      return result.current.confirm({
        cancelLabel: 'Stay',
        confirmLabel: 'Discard',
        message: 'unsaved',
        title: 'discard?',
      });
    }

    let promise!: Promise<boolean>;
    act(() => {
      promise = attemptClose(true);
    });
    const dialog = await screen.findByRole('dialog');
    const discard = await within(dialog).findByRole('button', {
      name: 'Discard',
    });
    await act(async () => {
      discard.click();
    });
    await expect(promise).resolves.toBe(true);
  });

  it('clean form short-circuits without opening a modal', async () => {
    const { result } = renderHook(() => useModal(), { wrapper });

    async function attemptClose(isDirty: boolean): Promise<boolean> {
      if (!isDirty) return true;
      return result.current.confirm({
        message: 'unsaved',
        title: 'discard?',
      });
    }

    const value = await attemptClose(false);
    expect(value).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
