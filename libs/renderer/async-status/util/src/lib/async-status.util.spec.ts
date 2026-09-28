import { fail, ok } from '@zmt/contracts';

import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  errorOf,
  isSettled,
  settle,
  statusOf,
} from './async-status.util';

describe('async status', () => {
  it('builds an error status around the ipc error', () => {
    expect(asyncError({ code: 404, message: 'missing' })).toEqual({
      error: { code: 404, message: 'missing' },
      kind: 'error',
    });
  });

  it('treats success and error as settled and idle and loading as pending', () => {
    expect(isSettled(ASYNC_SUCCESS)).toBe(true);
    expect(isSettled(asyncError({ code: 500, message: 'boom' }))).toBe(true);
    expect(isSettled(ASYNC_IDLE)).toBe(false);
    expect(isSettled(ASYNC_LOADING)).toBe(false);
  });

  it('routes a result envelope to exactly one handler', () => {
    const success = vi.fn();
    const failure = vi.fn();
    settle(ok('data'), { failure, success });
    expect(success).toHaveBeenCalledWith('data');
    expect(failure).not.toHaveBeenCalled();
    settle(fail(403, 'denied'), { failure, success });
    expect(failure).toHaveBeenCalledWith({ code: 403, message: 'denied' });
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('maps a result envelope to a status and a status back to its error', () => {
    expect(statusOf(ok(1))).toEqual(ASYNC_SUCCESS);
    expect(statusOf(fail(404, 'missing'))).toEqual(asyncError({ code: 404, message: 'missing' }));
    expect(errorOf(asyncError({ code: 404, message: 'missing' }))).toEqual({
      code: 404,
      message: 'missing',
    });
    expect(errorOf(ASYNC_IDLE)).toBeNull();
    expect(errorOf(ASYNC_LOADING)).toBeNull();
    expect(errorOf(ASYNC_SUCCESS)).toBeNull();
  });
});
