import type { en } from '../en/app';

export const uk: typeof en = {
  actions: {
    cancel: 'Скасувати',
    close: 'Закрити',
    discard: 'Відхилити',
    openFolder: 'Відкрити теку',
    retry: 'Повторити',
    save: 'Зберегти',
  },
  emptyStates: {
    selectModRoot:
      'Виберіть корінь мода у дереві файлів, щоб переглянути його дескриптор.',
  },
  errorBoundary: {
    message:
      'Програма зіткнулася з непередбаченою помилкою і не може продовжити роботу. Перезавантажте вікно для відновлення.',
    reload: 'Перезавантажити',
    title: 'Сталася помилка',
  },
  footer: {
    localeSwitcher: {
      error: 'Не вдалося змінити мову. Спробуйте ще раз.',
      label: 'Мова',
    },
  },
  header: {
    appSettings: {
      label: 'Налаштування застосунку',
    },
    title: 'ZMT',
  },
  layout: {
    drawer: {
      collapse: 'Згорнути',
      expand: 'Розгорнути',
    },
  },
  modals: {
    unsavedChanges: {
      title: 'Незбережені зміни',
    },
  },
};
