export type TicketId = `ZMT-A-${number}`;

export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';

  constructor(readonly ticket: TicketId) {
    super(`Not implemented; the body ships with ${ticket}`);
  }
}
