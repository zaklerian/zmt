import type { en } from '../en/feature.tech-tree-canvas';

export const de: typeof en = {
  addChild: 'Voraussetzung hinzufügen',
  addFree: 'Technologie hier hinzufügen',
  addFreeHint:
    'Rechtsklick auf eine Technologie oder die leere Fläche für Aktionen.',
  addStatus: {
    error: 'Die Technologie konnte hier nicht hinzugefügt werden.',
    readonly: 'Keine bearbeitbare Quelle besitzt diesen Technologiebaum.',
  },
  delete: 'Löschen',
  deleteDialog: {
    blocked:
      '{{total}} davon gehören zu einer schreibgeschützten Quelle und können nicht gelöscht werden.',
    cancel: 'Abbrechen',
    confirmItem: 'Element löschen',
    confirmTree: 'Baum löschen ({{total}})',
    inbound:
      '{{total}} Technologien verweisen auf die gelöschte Menge; ihre Voraussetzungen laufen ins Leere.',
    itemSummary: 'Element löschen entfernt {{total}} Technologie.',
    title: '{{token}} löschen?',
    treeSummary: 'Baum löschen entfernt {{total}} Technologien.',
  },
  deleteStatus: {
    error: 'Die Technologie konnte nicht gelöscht werden.',
    readonly:
      'Eine Technologie dieser Menge gehört zu einer schreibgeschützten Quelle.',
  },
  dependenciesToggle: 'Abhängigkeiten anzeigen',
  edit: 'Bearbeiten',
  editStatus: {
    error: 'Die Technologie konnte nicht geöffnet werden.',
    readonly: 'Diese Technologie gehört zu einer schreibgeschützten Quelle.',
  },
  empty: 'Keine Luftfahrttechnologien zum Anzeigen.',
  error: 'Der Luftfahrt-Technologiebaum konnte nicht geladen werden.',
  loading: 'Luftfahrt-Technologiebaum wird geladen…',
};
