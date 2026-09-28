import { type App } from 'electron';

export type LifecycleApp = Pick<App, 'on' | 'quit'>;

export interface LifecycleOptions {
  readonly onActivate: () => void;
  readonly platform: NodeJS.Platform;
}

export function shouldQuitWhenAllWindowsClose(platform: NodeJS.Platform): boolean {
  return platform !== 'darwin';
}

export function registerAppLifecycle(app: LifecycleApp, options: LifecycleOptions): void {
  app.on('activate', options.onActivate);
  app.on('window-all-closed', () => {
    if (shouldQuitWhenAllWindowsClose(options.platform)) {
      app.quit();
    }
  });
}
