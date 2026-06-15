export const en = {
  errors: {
    message: 'The descriptor could not be saved. Please try again.',
    title: 'Save failed',
  },
  form: {
    fields: {
      name: { label: 'Name' },
      path: { label: 'Path' },
      picture: { label: 'Picture path' },
      supportedVersion: { label: 'Supported game version' },
      tags: {
        label: 'Tags',
        placeholder: 'Add tag…',
      },
      version: { label: 'Version' },
    },
  },
  save: {
    success: 'Descriptor saved',
    unsavedMessage: 'You have unsaved descriptor edits. Discard them?',
  },
  view: {
    noPluginError: 'No renderer plugin registered for the active game.',
    title: 'Mod descriptor',
  },
  warnings: {
    parser: {
      offset: 'offset {{from}}–{{to}}',
      title: 'Parser warnings ({{count}})',
    },
  },
};
