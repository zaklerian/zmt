export const en = {
  addChild: 'Add prerequisite',
  addFree: 'Add technology here',
  addFreeHint: 'Right-click a technology or the empty canvas for actions.',
  addStatus: {
    error: 'The technology could not be added here.',
    readonly: 'No editable source owns this tech tree.',
  },
  delete: 'Delete',
  deleteDialog: {
    blocked:
      '{{total}} of them are owned by a read-only source and cannot be deleted.',
    cancel: 'Cancel',
    confirmItem: 'Delete item',
    confirmTree: 'Delete tree ({{total}})',
    inbound:
      '{{total}} technologies reference the deleted set; their prerequisites will dangle.',
    itemSummary: 'Delete item removes {{total}} technology.',
    title: 'Delete {{token}}?',
    treeSummary: 'Delete tree removes {{total}} technologies.',
  },
  deleteStatus: {
    error: 'The technology could not be deleted.',
    readonly: 'A technology in this set is owned by a read-only source.',
  },
  dependenciesToggle: 'Show dependencies',
  edit: 'Edit',
  editStatus: {
    error: 'The technology could not be opened.',
    readonly: 'This technology is owned by a read-only source.',
  },
  empty: 'No air technologies to display.',
  error: 'The air tech tree could not be loaded.',
  loading: 'Loading the air tech tree…',
};
