import { app } from 'electron';

type RegisterAppLifecycleOptions = {
  readonly onActivate: () => void;
};

export function registerAppLifecycle(
  options: RegisterAppLifecycleOptions,
): void {
  app.on('activate', options.onActivate);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
