import { deferred, flushPromises } from './deferred.util';

describe('deferred', () => {
  it('resolves the promise from the outside', async () => {
    const pending = deferred<number>();
    pending.resolve(7);
    await expect(pending.promise).resolves.toBe(7);
  });

  it('rejects the promise from the outside', async () => {
    const pending = deferred<number>();
    pending.reject(new Error('no'));
    await expect(pending.promise).rejects.toThrow('no');
  });

  it('flushes queued promise callbacks', async () => {
    let settled = false;
    void Promise.resolve().then(() => {
      settled = true;
    });
    await flushPromises();
    expect(settled).toBe(true);
  });
});
