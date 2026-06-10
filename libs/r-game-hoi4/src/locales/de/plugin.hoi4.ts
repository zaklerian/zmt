import type { en } from '../en/plugin.hoi4';

export const de: typeof en = {
  equipment: {
    actions: {
      add: 'Hinzufügen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
    },
    columns: {
      domain: 'Bereich',
      kind: 'Art',
      name: 'Name',
      type: 'Typ',
    },
    domain: {
      air: 'Luft',
      land: 'Land',
      naval: 'Marine',
    },
    status: {
      invalid: 'Ungültig',
      unresolved: 'Archetyp nicht gefunden',
    },
  },
};
