import { EntityFormValues } from '@r-core';
import { describe, expect, it, vi } from 'vitest';

import { modInfoEditActions } from './mod-info-edit-actions';

describe('modInfoEditActions.save', () => {
  it('delegates to the shell save and threads the refreshed values back', async () => {
    const refreshed = { name: 'refreshed' } as unknown as EntityFormValues;
    const values = { name: 'submitted' } as unknown as EntityFormValues;
    const save = vi.fn().mockResolvedValue(refreshed);
    const onRefreshed = vi.fn();

    await modInfoEditActions.save.execute({ onRefreshed, save, values });

    expect(save).toHaveBeenCalledWith(values);
    expect(onRefreshed).toHaveBeenCalledWith(refreshed);
  });

  it('labels with the save i18n key', () => {
    expect(
      modInfoEditActions.save.label({
        onRefreshed: vi.fn(),
        save: vi.fn(),
        values: {} as EntityFormValues,
      }),
    ).toBe('app:actions.save');
  });
});

describe('modInfoEditActions.retry', () => {
  it('reloads the descriptor on execute', () => {
    const reload = vi.fn();
    void modInfoEditActions.retry.execute({ reload });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
