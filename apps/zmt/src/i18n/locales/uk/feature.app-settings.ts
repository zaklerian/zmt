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
      hideVanilla: {
        label: 'Приховати ванільні файли',
      },
      sectionLabel: 'Відображення файлів',
    },
    game: {
      label: 'Гра',
    },
    gameFolder: {
      browse: 'Огляд…',
      label: 'Тека гри',
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
