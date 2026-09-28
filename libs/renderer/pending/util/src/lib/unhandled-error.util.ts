import { config } from 'rxjs';

export async function collectUnhandledErrors(run: () => void): Promise<readonly unknown[]> {
  const errors = new Set<unknown>();
  const previous = config.onUnhandledError;
  config.onUnhandledError = (error: unknown) => {
    errors.add(error);
  };
  try {
    run();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  } finally {
    config.onUnhandledError = previous;
  }
  return [...errors];
}
