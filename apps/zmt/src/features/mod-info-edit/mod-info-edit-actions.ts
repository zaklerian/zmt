import { Action, EntityFormValues } from '@r-core';

export interface ModInfoRetryContext {
  reload: () => void;
}

// Save delegates to the form shell's existing save (ADR 015 / ADR 018): the
// shell owns dirty tracking and the submit pipeline; this action only forwards
// the descriptor write and threads the reparsed values back for the shell's
// post-save reset.
export interface ModInfoSaveContext {
  onRefreshed: (values: EntityFormValues | void) => void;
  save: (values: EntityFormValues) => Promise<EntityFormValues | void>;
  values: EntityFormValues;
}

export const modInfoEditActions: {
  readonly retry: Action<ModInfoRetryContext>;
  readonly save: Action<ModInfoSaveContext>;
} = {
  retry: {
    execute: (context): void => context.reload(),
    id: 'mod-info-retry',
    isAvailable: () => true,
    label: () => 'app:actions.retry',
  },

  save: {
    execute: async (context): Promise<void> => {
      context.onRefreshed(await context.save(context.values));
    },
    id: 'mod-info-save',
    isAvailable: () => true,
    label: () => 'app:actions.save',
  },
};
