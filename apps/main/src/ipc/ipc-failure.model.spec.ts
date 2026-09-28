import { IpcFailure, isErrno } from './ipc-failure.model';

describe('IpcFailure', () => {
  it('is an Error carrying a contract code', () => {
    const failure = new IpcFailure(404, 'missing');
    expect(failure).toBeInstanceOf(Error);
    expect(failure.name).toBe('IpcFailure');
    expect(failure.code).toBe(404);
    expect(failure.message).toBe('missing');
  });
});

describe('isErrno', () => {
  it('matches Node errno codes', () => {
    expect(isErrno(Object.assign(new Error('x'), { code: 'ENOENT' }), 'ENOENT')).toBe(true);
    expect(isErrno(Object.assign(new Error('x'), { code: 'EACCES' }), 'ENOENT')).toBe(false);
    expect(isErrno(new Error('x'), 'ENOENT')).toBe(false);
    expect(isErrno(null, 'ENOENT')).toBe(false);
    expect(isErrno('ENOENT', 'ENOENT')).toBe(false);
  });
});
