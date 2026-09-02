export const en = {
  actions: {
    addMod: 'Add mod',
    cancel: 'Cancel',
    close: 'Close',
    discard: 'Discard',
    openModFolder: 'Open mod folder',
    retry: 'Retry',
    save: 'Save',
  },
  emptyStates: {
    selectModRoot: 'Select a mod root in the file tree to view its descriptor.',
  },
  errorBoundary: {
    message:
      'The application hit an unexpected error and cannot continue. Reload the window to recover.',
    reload: 'Reload',
    title: 'Something went wrong',
  },
  footer: {
    localeSwitcher: {
      error: 'Language could not be changed. Please try again.',
      label: 'Language',
    },
  },
  header: {
    appSettings: {
      label: 'App Settings',
    },
    title: 'ZMT',
  },
  layout: {
    drawer: {
      collapse: 'Collapse',
      expand: 'Expand',
    },
    panelMode: {
      file: 'File navigation',
      nav: 'Feature navigation',
    },
  },
  modals: {
    unsavedChanges: {
      title: 'Unsaved changes',
    },
  },
  nav: {
    noSelection: 'Select a feature to view its tree.',
    treePlaceholder: {
      caption: 'The canvas for this feature ships in a later ticket.',
      title: 'Tree renders here',
    },
  },
  panel: {
    breadcrumbs: {
      label: 'File path',
    },
    toolbar: {
      label: 'Panel actions',
    },
  },
  saveTargets: {
    createNew: 'Create a new file…',
    description:
      'Where new content of each kind is written in the selected mod. Unset kinds keep the default the write computes for itself.',
    kind: {
      locKey: 'New localisation keys',
      technology: 'New technologies',
    },
    mod: 'Mod',
    newFile: 'New file name',
    newFileHelp: 'Created on the first write, under {{folder}}/.',
    noMods: 'No editable mod is included in the workspace.',
    title: 'Save targets',
    useDefault: 'Default (computed per write)',
  },
};
