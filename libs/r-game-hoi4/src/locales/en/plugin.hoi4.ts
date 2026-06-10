export const en = {
  equipment: {
    actions: {
      add: 'Add',
      delete: 'Delete',
      edit: 'Edit',
    },
    columns: {
      domain: 'Domain',
      kind: 'Kind',
      name: 'Name',
      type: 'Type',
    },
    delete: {
      confirm: 'Delete',
      message: 'Delete "{name}"? This cannot be undone.',
      title: 'Delete equipment',
    },
    domain: {
      air: 'Air',
      land: 'Land',
      naval: 'Naval',
    },
    errors: {
      conflict:
        'This equipment changed on disk since you opened it. Reload and try again.',
      forbidden: 'This file is read-only and cannot be modified.',
      notFound: 'This equipment no longer exists.',
      title: 'Action failed',
      unknown: 'Something went wrong. Please try again.',
    },
    form: {
      addField: 'Add field',
      cancel: 'Cancel',
      discard: 'Discard',
      fields: {
        key: {
          label: 'Property',
        },
        value: {
          label: 'Value',
        },
      },
      removeField: 'Remove',
      save: 'Save',
      unsavedMessage: 'You have unsaved changes. Discard them?',
      unsavedTitle: 'Unsaved changes',
      validation: {
        keyDuplicate: 'Duplicate property key.',
        keyRequired: 'Property key is required.',
      },
    },
    kind: {
      archetype: 'Archetype',
      regular: 'Regular',
    },
    status: {
      invalid: 'Invalid',
      unresolved: 'Archetype not found',
    },
  },
  module: {
    actions: {
      delete: 'Delete',
      edit: 'Edit',
    },
    columns: {
      category: 'Category',
      domain: 'Domain',
      name: 'Name',
    },
    delete: {
      confirm: 'Delete',
      message: 'Delete "{name}"? This cannot be undone.',
      title: 'Delete module',
    },
    domain: {
      air: 'Air',
      land: 'Land',
      naval: 'Naval',
      unclassified: 'Unclassified',
    },
    errors: {
      conflict:
        'This module changed on disk since you opened it. Reload and try again.',
      forbidden: 'This file is read-only and cannot be modified.',
      notFound: 'This module no longer exists.',
      title: 'Action failed',
      unknown: 'Something went wrong. Please try again.',
    },
    form: {
      addField: 'Add field',
      cancel: 'Cancel',
      discard: 'Discard',
      fields: {
        key: {
          label: 'Property',
        },
        value: {
          label: 'Value',
        },
      },
      header: {
        category: 'Category',
        domain: 'Domain',
      },
      removeField: 'Remove',
      save: 'Save',
      sections: {
        addAverageStats: 'Average stats (add_average_stats)',
        addStats: 'Added stats (add_stats)',
        multiplyStats: 'Multiplied stats (multiply_stats)',
        scalars: 'Module properties',
      },
      unsavedMessage: 'You have unsaved changes. Discard them?',
      unsavedTitle: 'Unsaved changes',
      validation: {
        keyDuplicate: 'Duplicate property key.',
        keyRequired: 'Property key is required.',
      },
    },
  },
};
