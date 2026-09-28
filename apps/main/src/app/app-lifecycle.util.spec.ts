import {
  type LifecycleApp,
  registerAppLifecycle,
  shouldQuitWhenAllWindowsClose,
} from './app-lifecycle.util';

type Listener = () => void;

function fakeApp(): LifecycleApp & {
  readonly listeners: ReadonlyMap<string, Listener>;
  readonly quit: ReturnType<typeof vi.fn>;
} {
  const listeners = new Map<string, Listener>();
  const quit = vi.fn();
  const on = vi.fn((event: string, listener: Listener) => {
    listeners.set(event, listener);
    return app;
  });
  const app = { listeners, on, quit } as unknown as LifecycleApp & {
    readonly listeners: ReadonlyMap<string, Listener>;
    readonly quit: ReturnType<typeof vi.fn>;
  };
  return app;
}

describe('registerAppLifecycle', () => {
  it('forwards activate to the callback', () => {
    const app = fakeApp();
    const onActivate = vi.fn();
    registerAppLifecycle(app, { onActivate, platform: 'linux' });
    app.listeners.get('activate')?.();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('quits when all windows close except on darwin', () => {
    const linux = fakeApp();
    registerAppLifecycle(linux, { onActivate: vi.fn(), platform: 'linux' });
    linux.listeners.get('window-all-closed')?.();
    expect(linux.quit).toHaveBeenCalledTimes(1);

    const darwin = fakeApp();
    registerAppLifecycle(darwin, { onActivate: vi.fn(), platform: 'darwin' });
    darwin.listeners.get('window-all-closed')?.();
    expect(darwin.quit).not.toHaveBeenCalled();
  });
});

describe('shouldQuitWhenAllWindowsClose', () => {
  it('is false only on darwin', () => {
    expect(shouldQuitWhenAllWindowsClose('darwin')).toBe(false);
    expect(shouldQuitWhenAllWindowsClose('win32')).toBe(true);
    expect(shouldQuitWhenAllWindowsClose('linux')).toBe(true);
  });
});
