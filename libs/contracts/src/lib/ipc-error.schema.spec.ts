import * as v from 'valibot';

import { IPC_ERROR_CODE_LIST, IPC_ERROR_CODES, IPC_ERROR_SCHEMA } from './ipc-error.schema';

describe('IPC_ERROR_SCHEMA', () => {
  it('uses HTTP-style codes as a closed set', () => {
    expect(IPC_ERROR_CODE_LIST).toEqual([400, 409, 403, 500, 404, 413]);
    expect(IPC_ERROR_CODES.forbidden).toBe(403);
  });

  it('parses a structured error and keeps it readonly', () => {
    const parsed = v.parse(IPC_ERROR_SCHEMA, { code: 404, message: 'missing' });
    expect(parsed).toEqual({ code: 404, message: 'missing' });
  });

  it.each([
    [{ code: 418, message: 'teapot' }],
    [{ code: '404', message: 'missing' }],
    [{ code: 404, message: '' }],
    [{ code: 404, message: 'x'.repeat(1025) }],
    [{ code: 404 }],
    [null],
    ['404'],
  ])('rejects %j', (value) => {
    expect(v.safeParse(IPC_ERROR_SCHEMA, value).success).toBe(false);
  });
});
