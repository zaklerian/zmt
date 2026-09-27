import type { Messages } from '../src/lib/messages.model';

export const WRONG_PARAMETER_MESSAGES = {
  app: {
    title: 'ZMT',
  },
  home: {
    version: (version: number) => `Version ${version.toFixed(0)}`,
    welcome: 'Welcome',
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
