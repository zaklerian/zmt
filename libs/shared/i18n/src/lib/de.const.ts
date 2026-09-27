import type { Messages } from './messages.model';

export const DE_MESSAGES = {
  app: {
    title: 'ZMT — Mod-Verwaltung',
  },
  home: {
    version: (version: string) => `Version ${version}`,
    welcome: 'Willkommen bei ZMT',
  },
  locale: {
    de: 'Deutsch',
    en: 'English',
  },
  shell: {
    language: 'Sprache',
    navigation: 'Hauptnavigation',
    toggleNavigation: 'Navigation umschalten',
  },
} satisfies Messages;
