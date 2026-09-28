import { NotImplementedError, type TicketId } from './not-implemented-error.model';

export function pending(ticket: TicketId): never {
  throw new NotImplementedError(ticket);
}
