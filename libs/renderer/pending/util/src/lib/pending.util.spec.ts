import { NotImplementedError } from './not-implemented-error.model';
import { pending } from './pending.util';

describe('pending', () => {
  it('throws a NotImplementedError carrying the ticket id', () => {
    expect(() => pending('ZMT-A-5')).toThrow(NotImplementedError);
    expect(() => pending('ZMT-A-5')).toThrow('ZMT-A-5');
  });

  it('names the error and keeps the ticket as a field', () => {
    const error = new NotImplementedError('ZMT-A-7');
    expect(error.name).toBe('NotImplementedError');
    expect(error.ticket).toBe('ZMT-A-7');
    expect(error).toBeInstanceOf(Error);
  });
});
