import type { en } from '../en/plugin.hoi4';

export const uk: typeof en = {
  equipment: {
    actions: {
      add: 'Додати',
      delete: 'Видалити',
      edit: 'Редагувати',
    },
    columns: {
      domain: 'Сфера',
      kind: 'Вид',
      name: 'Назва',
      type: 'Тип',
    },
    delete: {
      confirm: 'Видалити',
      message: 'Видалити «{name}»? Цю дію не можна скасувати.',
      title: 'Видалити спорядження',
    },
    domain: {
      air: 'Повітря',
      land: 'Суша',
      naval: 'Флот',
    },
    errors: {
      conflict:
        'Це спорядження змінилося на диску після відкриття. Перезавантажте та спробуйте ще раз.',
      forbidden:
        'Цей файл доступний лише для читання та не може бути змінений.',
      notFound: 'Це спорядження більше не існує.',
      title: 'Помилка дії',
      unknown: 'Щось пішло не так. Спробуйте ще раз.',
    },
    form: {
      addField: 'Додати поле',
      cancel: 'Скасувати',
      discard: 'Відхилити',
      fields: {
        key: {
          label: 'Властивість',
        },
        value: {
          label: 'Значення',
        },
      },
      removeField: 'Вилучити',
      save: 'Зберегти',
      unsavedMessage: 'У вас є незбережені зміни. Відхилити їх?',
      unsavedTitle: 'Незбережені зміни',
      validation: {
        keyDuplicate: 'Дубльований ключ властивості.',
        keyRequired: "Ключ властивості є обов'язковим.",
      },
    },
    kind: {
      archetype: 'Архетип',
      regular: 'Звичайний',
    },
    status: {
      invalid: 'Недійсний',
      unresolved: 'Архетип не знайдено',
    },
  },
  module: {
    columns: {
      category: 'Категорія',
      domain: 'Сфера',
      name: 'Назва',
    },
    domain: {
      air: 'Повітря',
      land: 'Суша',
      naval: 'Флот',
      unclassified: 'Не класифіковано',
    },
  },
};
