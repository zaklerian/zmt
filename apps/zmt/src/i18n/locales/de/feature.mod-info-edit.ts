import type { en } from '../en/feature.mod-info-edit';

export const de: typeof en = {
  errors: {
    message:
      'Der Deskriptor konnte nicht gespeichert werden. Bitte erneut versuchen.',
    title: 'Speichern fehlgeschlagen',
  },
  form: {
    fields: {
      name: { label: 'Name' },
      path: { label: 'Pfad' },
      picture: { label: 'Bildpfad' },
      supportedVersion: { label: 'Unterstützte Spielversion' },
      tags: {
        label: 'Schlagwörter',
        placeholder: 'Tag hinzufügen…',
      },
      version: { label: 'Version' },
    },
  },
  save: {
    success: 'Deskriptor gespeichert',
    unsavedMessage: 'Es gibt ungespeicherte Deskriptor-Änderungen. Verwerfen?',
  },
  view: {
    noPluginError: 'Kein Renderer-Plugin für das aktive Spiel registriert.',
    title: 'Mod-Deskriptor',
  },
  warnings: {
    parser: {
      offset: 'Offset {{from}}–{{to}}',
      title: 'Parser-Warnungen ({{count}})',
    },
  },
};
