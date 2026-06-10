export interface Action<Context> {
  execute: (context: Context) => Promise<void> | void;
  id: string;
  isAvailable: (context: Context) => boolean;
  // Returns an i18n key, not display text; the hosting surface resolves it
  // through t(). Keeps actions pure — no i18n instance, testable in isolation.
  label: (context: Context) => string;
}
