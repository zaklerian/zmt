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
    delete: {
      confirm: 'Löschen',
      message:
        'Möchten Sie „{name}“ löschen? Dies kann nicht rückgängig gemacht werden.',
      title: 'Ausrüstung löschen',
    },
    domain: {
      air: 'Luft',
      land: 'Land',
      naval: 'Marine',
    },
    errors: {
      conflict:
        'Diese Ausrüstung wurde seit dem Öffnen auf der Festplatte geändert. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Diese Ausrüstung existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      addField: 'Feld hinzufügen',
      cancel: 'Abbrechen',
      discard: 'Verwerfen',
      fields: {
        key: {
          label: 'Eigenschaft',
        },
        value: {
          label: 'Wert',
        },
      },
      removeField: 'Entfernen',
      save: 'Speichern',
      unsavedMessage: 'Sie haben nicht gespeicherte Änderungen. Verwerfen?',
      unsavedTitle: 'Nicht gespeicherte Änderungen',
      validation: {
        keyDuplicate: 'Doppelter Eigenschaftsschlüssel.',
        keyRequired: 'Eigenschaftsschlüssel ist erforderlich.',
      },
    },
    kind: {
      archetype: 'Archetyp',
      regular: 'Regulär',
    },
    status: {
      invalid: 'Ungültig',
      unresolved: 'Archetyp nicht gefunden',
    },
  },
  module: {
    actions: {
      delete: 'Löschen',
      edit: 'Bearbeiten',
    },
    columns: {
      category: 'Kategorie',
      domain: 'Bereich',
      name: 'Name',
    },
    delete: {
      confirm: 'Löschen',
      message:
        'Möchten Sie „{name}“ löschen? Dies kann nicht rückgängig gemacht werden.',
      title: 'Modul löschen',
    },
    domain: {
      air: 'Luft',
      land: 'Land',
      naval: 'Marine',
      unclassified: 'Nicht klassifiziert',
    },
    errors: {
      conflict:
        'Dieses Modul wurde seit dem Öffnen auf der Festplatte geändert. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Dieses Modul existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      addField: 'Feld hinzufügen',
      cancel: 'Abbrechen',
      discard: 'Verwerfen',
      fields: {
        key: {
          label: 'Eigenschaft',
        },
        value: {
          label: 'Wert',
        },
      },
      header: {
        category: 'Kategorie',
        domain: 'Bereich',
      },
      removeField: 'Entfernen',
      save: 'Speichern',
      sections: {
        addAverageStats: 'Durchschnittswerte (add_average_stats)',
        addStats: 'Additive Werte (add_stats)',
        multiplyStats: 'Multiplikative Werte (multiply_stats)',
        scalars: 'Moduleigenschaften',
      },
      unsavedMessage: 'Sie haben nicht gespeicherte Änderungen. Verwerfen?',
      unsavedTitle: 'Nicht gespeicherte Änderungen',
      validation: {
        keyDuplicate: 'Doppelter Eigenschaftsschlüssel.',
        keyRequired: 'Eigenschaftsschlüssel ist erforderlich.',
      },
    },
  },
};
