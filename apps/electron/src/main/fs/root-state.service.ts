let currentRoot: null | string = null;

export const rootStateService = {
  get(): null | string {
    return currentRoot;
  },
  set(value: null | string): void {
    currentRoot = value;
  },
};
