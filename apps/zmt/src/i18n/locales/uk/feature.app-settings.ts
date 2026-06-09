import type { en } from '../en/feature.app-settings';

export const uk: typeof en = {
  close: {
    unsavedMessage:
      'У вас є незбережені перемикачі функцій. Закрити та відхилити їх?',
  },
  form: {
    features: {
      sectionLabel: 'Функції',
    },
    fileDisplay: {
      hideUnsupported: {
        label: 'Приховати непідтримувані файли',
      },
      sectionLabel: 'Відображення файлів',
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
    title: 'Налаштування застосунку',
  },
};
