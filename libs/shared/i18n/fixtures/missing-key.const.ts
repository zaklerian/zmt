import type { Messages } from '../src/lib/messages.model';

export const MISSING_KEY_MESSAGES = {
  app: {
    title: 'ZMT',
  },
  home: {
    version: (version: string) => `Version ${version}`,
  },
  locale: {
    de: 'Deutsch',
    en: 'English',
  },
  shell: {
    language: 'Language',
    navigation: 'Main navigation',
    toggleNavigation: 'Toggle navigation',
  },
} satisfies Messages;
