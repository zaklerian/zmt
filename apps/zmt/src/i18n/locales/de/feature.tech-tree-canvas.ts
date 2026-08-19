import type { en } from '../en/feature.tech-tree-canvas';

export const de: typeof en = {
  addChild: 'Voraussetzung hinzufügen',
  addFreeHint:
    'Rechtsklick auf die leere Fläche, um dort eine Technologie hinzuzufügen.',
  addStatus: {
    error: 'Die Technologie konnte hier nicht hinzugefügt werden.',
    readonly: 'Keine bearbeitbare Quelle besitzt diesen Technologiebaum.',
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
