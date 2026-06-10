import type { en } from '../en/app';

export const de: typeof en = {
  actions: {
    cancel: 'Abbrechen',
    close: 'Schließen',
    discard: 'Verwerfen',
    openFolder: 'Ordner öffnen',
    retry: 'Erneut versuchen',
    save: 'Speichern',
  },
  emptyStates: {
    selectModRoot:
      'Wählen Sie einen Mod-Stamm im Dateibaum, um den Deskriptor anzuzeigen.',
  },
  errorBoundary: {
    message:
      'Die Anwendung ist auf einen unerwarteten Fehler gestoßen und kann nicht fortfahren. Laden Sie das Fenster neu, um es wiederherzustellen.',
    reload: 'Neu laden',
    title: 'Etwas ist schiefgelaufen',
  },
  footer: {
    localeSwitcher: {
      error: 'Sprache konnte nicht geändert werden. Bitte erneut versuchen.',
      label: 'Sprache',
    },
  },
  header: {
    appSettings: {
      label: 'App-Einstellungen',
    },
    title: 'ZMT',
  },
  layout: {
    drawer: {
      collapse: 'Einklappen',
      expand: 'Ausklappen',
    },
  },
  modals: {
    unsavedChanges: {
      title: 'Ungespeicherte Änderungen',
    },
  },
  panel: {
    breadcrumbs: {
      label: 'Dateipfad',
    },
    toolbar: {
      label: 'Panel-Aktionen',
    },
  },
};
