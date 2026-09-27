import { bodyShape, bodySymbols, ticketHeader } from './rules.ts';

export const ZMT_PLUGIN = {
  rules: {
    'zmt/body-shape': bodyShape,
    'zmt/body-symbols': bodySymbols,
    'zmt/ticket-header': ticketHeader,
  },
};
