import type { en } from '../en/app';

export const uk: typeof en = {
  actions: {
    addMod: 'Додати мод',
    cancel: 'Скасувати',
    close: 'Закрити',
    discard: 'Відхилити',
    openModFolder: 'Відкрити теку мода',
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
    panelMode: {
      file: 'Навігація файлами',
      nav: 'Навігація функціями',
    },
  },
  modals: {
    unsavedChanges: {
      title: 'Незбережені зміни',
    },
  },
  nav: {
    noSelection: 'Виберіть функцію, щоб переглянути її дерево.',
    treePlaceholder: {
      caption: 'Полотно для цієї функції з’явиться в наступному тікеті.',
      title: 'Тут відображається дерево',
    },
  },
  panel: {
    breadcrumbs: {
      label: 'Шлях до файлу',
    },
    toolbar: {
      label: 'Дії панелі',
    },
  },
  saveTargets: {
    createNew: 'Створити новий файл…',
    description:
      'Куди записується новий вміст кожного виду у вибраному моді. Без вибору діє типове значення, обчислене самим записом.',
    kind: {
      locKey: 'Нові ключі локалізації',
      technology: 'Нові технології',
    },
    mod: 'Мод',
    newFile: 'Назва нового файлу',
    newFileHelp: 'Створюється під час першого запису, у {{folder}}/.',
    noMods: 'У робочій області немає редагованого мода.',
    title: 'Цілі збереження',
    useDefault: 'Типове (обчислюється для кожного запису)',
  },
};
