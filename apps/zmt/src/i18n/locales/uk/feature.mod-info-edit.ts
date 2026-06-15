import type { en } from '../en/feature.mod-info-edit';

export const uk: typeof en = {
  errors: {
    message: 'Не вдалося зберегти дескриптор. Спробуйте ще раз.',
    title: 'Помилка збереження',
  },
  form: {
    fields: {
      name: { label: 'Назва' },
      path: { label: 'Шлях' },
      picture: { label: 'Шлях до зображення' },
      supportedVersion: { label: 'Підтримувана версія гри' },
      tags: {
        label: 'Теги',
        placeholder: 'Додати тег…',
      },
      version: { label: 'Версія' },
    },
  },
  save: {
    success: 'Дескриптор збережено',
    unsavedMessage: 'У вас є незбережені зміни дескриптора. Відхилити їх?',
  },
  view: {
    noPluginError: 'Не зареєстровано плагін рендерера для активної гри.',
    title: 'Дескриптор мода',
  },
  warnings: {
    parser: {
      offset: 'Зміщення {{from}}–{{to}}',
      title: 'Попередження парсера ({{count}})',
    },
  },
};
