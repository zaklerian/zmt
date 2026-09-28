import type { AppApi } from '@zmt/contracts';

declare global {
  interface Window {
    readonly api: AppApi;
  }
}

export type WindowApi = Window['api'];
