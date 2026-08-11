import type { en } from '../en/app';

export const de: typeof en = {
  actions: {
    addMod: 'Mod hinzufügen',
    cancel: 'Abbrechen',
    close: 'Schließen',
    discard: 'Verwerfen',
    openModFolder: 'Mod-Ordner öffnen',
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
    panelMode: {
      file: 'Dateinavigation',
      nav: 'Funktionsnavigation',
    },
  },
  modals: {
    unsavedChanges: {
      title: 'Ungespeicherte Änderungen',
    },
  },
  nav: {
    noSelection: 'Wählen Sie eine Funktion, um ihren Baum anzuzeigen.',
    treePlaceholder: {
      caption:
        'Die Arbeitsfläche für diese Funktion folgt in einem späteren Ticket.',
      title: 'Hier wird der Baum dargestellt',
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
