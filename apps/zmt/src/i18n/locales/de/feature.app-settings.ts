import type { en } from '../en/feature.app-settings';

export const de: typeof en = {
  close: {
    unsavedMessage:
      'Es gibt ungespeicherte Funktionseinstellungen. Schließen und verwerfen?',
  },
  form: {
    features: {
      sectionLabel: 'Funktionen',
    },
    fileDisplay: {
      hideUnsupported: {
        label: 'Nicht unterstützte Dateien ausblenden',
      },
      hideVanilla: {
        label: 'Vanilla-Dateien ausblenden',
      },
      sectionLabel: 'Dateianzeige',
    },
    game: {
      label: 'Spiel',
    },
    gameFolder: {
      browse: 'Durchsuchen…',
      label: 'Spielordner',
    },
  },
  gameSwitch: {
    unsavedMessage:
      'Es gibt ungespeicherte Funktionseinstellungen. Spiel wechseln und verwerfen?',
  },
  modal: {
    noPlugins: 'Keine Plugins registriert.',
    title: 'App-Einstellungen',
  },
};
