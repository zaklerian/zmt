import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  isSettled,
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
});
