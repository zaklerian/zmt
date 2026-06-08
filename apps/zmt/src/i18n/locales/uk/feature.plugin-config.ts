import type { en } from '../en/feature.plugin-config';

export const uk: typeof en = {
  close: {
    unsavedMessage:
      'У вас є незбережені перемикачі функцій. Закрити та відхилити їх?',
  },
  form: {
    features: {
      sectionLabel: 'Функції',
    },
    game: {
      label: 'Гра',
    },
  },
  gameSwitch: {
    unsavedMessage:
      'У вас є незбережені перемикачі функцій. Переключити гру та відхилити їх?',
  },
  modal: {
    noPlugins: 'Плагіни не зареєстровано.',
    title: 'Налаштування плагінів',
  },
};
