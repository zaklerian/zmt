import * as v from 'valibot';

import { IPC_ERROR_CODES } from './ipc-error.schema';
import { fail, ipcResultSchema, ok } from './ipc-result.schema';

const NUMBER_RESULT = ipcResultSchema(v.number());

describe('ipcResultSchema', () => {
  it('round-trips an ok envelope', () => {
    const parsed = v.parse(NUMBER_RESULT, ok(42));
    expect(parsed).toEqual({ data: 42, ok: true });
  });

  it('round-trips a fail envelope', () => {
    const parsed = v.parse(NUMBER_RESULT, fail(IPC_ERROR_CODES.notFound, 'missing'));
    expect(parsed).toEqual({ error: { code: 404, message: 'missing' }, ok: false });
  });

  it.each([
    [{ data: 'text', ok: true }],
    [{ data: 42, ok: false }],
    [{ error: { code: 404, message: 'missing' }, ok: true }],
    [{ error: { code: 999, message: 'missing' }, ok: false }],
    [{ ok: true }],
    [{ data: 42 }],
    [42],
  ])('rejects %j', (value) => {
    expect(v.safeParse(NUMBER_RESULT, value).success).toBe(false);
  });
});

describe('ok', () => {
  it('builds a frozen ok envelope', () => {
    const result = ok({ answer: 42 });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ answer: 42 });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('fail', () => {
  it('builds a frozen fail envelope with a frozen error', () => {
    const result = fail(IPC_ERROR_CODES.forbidden, 'outside root');
    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: 403, message: 'outside root' });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.error)).toBe(true);
  });
});
