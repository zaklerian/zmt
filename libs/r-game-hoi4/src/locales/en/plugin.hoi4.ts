export const en = {
  character: {
    actions: {
      edit: 'Edit',
    },
    columns: {
      gender: 'Gender',
      name: 'Name',
      roles: 'Roles',
    },
    errors: {
      conflict:
        'This character changed on disk since you opened it. Reload and try again.',
      forbidden: 'This file is read-only and cannot be modified.',
      notFound: 'This character no longer exists.',
      title: 'Action failed',
      unknown: 'Something went wrong. Please try again.',
    },
    form: {
      fields: {
        gender: 'Gender',
        name: 'Name',
      },
      portraits: {
        army: 'Army portraits',
        civilian: 'Civilian portraits',
        navy: 'Navy portraits',
        title: 'Portraits',
      },
      roles: {
        advisor: 'Advisor',
        corps_commander: 'Corps commander',
        country_leader: 'Country leader',
        field_marshal: 'Field marshal',
        navy_leader: 'Navy leader',
      },
      traits: 'Traits',
    },
  },
  equipment: {
    actions: {
      add: 'Add',
      delete: 'Delete',
      designModules: 'Design modules',
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
    designer: {
      clear: 'Clear',
      pickerPlaceholder: 'Select module',
      required: 'Required',
      title: 'Design modules',
      unfilledWarning: 'This required slot has no module assigned.',
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
      name: 'Name',
    },
    delete: {
      confirm: 'Delete',
      message: 'Delete "{name}"? This cannot be undone.',
      title: 'Delete module',
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
  technology: {
    actions: {
      edit: 'Edit',
    },
    columns: {
      categories: 'Categories',
      name: 'Name',
      paths: 'Paths',
    },
    errors: {
      conflict:
        'This technology changed on disk since you opened it. Reload and try again.',
      forbidden: 'This file is read-only and cannot be modified.',
      notFound: 'This technology no longer exists.',
      title: 'Action failed',
      unknown: 'Something went wrong. Please try again.',
    },
    form: {
      fields: {
        doctrine: 'Doctrine',
        doctrine_name: 'Doctrine name',
        research_cost: 'Research cost',
        show_equipment_icon: 'Show equipment icon',
        start_year: 'Start year',
      },
      folder: {
        add: 'Add folder',
        item: 'Folder',
        name: 'Name',
        title: 'Folders',
      },
      path: {
        add: 'Add path',
        item: 'Path',
        leads_to_tech: 'Leads to tech',
        research_cost_coeff: 'Research cost coefficient',
        title: 'Paths',
      },
      position: {
        title: 'Position',
        x: 'X',
        y: 'Y',
      },
      refLists: {
        categories: 'Categories',
        dependencies: 'Dependencies',
        enableEquipmentModules: 'Enable equipment modules',
        enableEquipments: 'Enable equipments',
        enableSubunits: 'Enable subunits',
        xor: 'Mutually exclusive (xor)',
      },
    },
  },
};
