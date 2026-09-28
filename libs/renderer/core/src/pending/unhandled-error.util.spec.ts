import { config, Subject, tap } from 'rxjs';

import { NotImplementedError } from './not-implemented-error.model';
import { pending } from './pending.util';
import { collectUnhandledErrors } from './unhandled-error.util';

describe('collectUnhandledErrors', () => {
  it('collects errors an unobserved rxjs pipeline reports and restores the handler', async () => {
    const source = new Subject<void>();
    source.pipe(tap(() => pending('ZMT-A-5'))).subscribe();

    const errors = await collectUnhandledErrors(() => {
      source.next();
    });

    expect(errors).toEqual([expect.any(NotImplementedError)]);
    expect(config.onUnhandledError).toBeNull();
  });

  it('returns an empty list when nothing fails', async () => {
    await expect(collectUnhandledErrors(() => undefined)).resolves.toEqual([]);
  });
});
