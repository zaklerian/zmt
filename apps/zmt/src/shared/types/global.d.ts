import { AppApiModel } from '@contracts';

export {};

declare global {
  interface Window {
    api: AppApiModel;
  }
}
