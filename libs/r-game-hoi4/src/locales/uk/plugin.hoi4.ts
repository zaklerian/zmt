import type { en } from '../en/plugin.hoi4';

export const uk: typeof en = {
  character: {
    actions: {
      edit: 'Редагувати',
    },
    columns: {
      gender: 'Стать',
      name: 'Імʼя',
      roles: 'Ролі',
    },
    errors: {
      conflict:
        'Цей персонаж змінився на диску відколи ви його відкрили. Перезавантажте та спробуйте ще раз.',
      forbidden: 'Цей файл доступний лише для читання і не може бути змінений.',
      notFound: 'Цей персонаж більше не існує.',
      title: 'Не вдалося виконати дію',
      unknown: 'Щось пішло не так. Будь ласка, спробуйте ще раз.',
    },
    form: {
      fields: {
        gender: 'Стать',
        name: 'Імʼя',
      },
      portraits: {
        army: 'Портрети армії',
        civilian: 'Цивільні портрети',
        navy: 'Портрети флоту',
        title: 'Портрети',
      },
      roles: {
        advisor: 'Радник',
        corps_commander: 'Командир корпусу',
        country_leader: 'Лідер країни',
        field_marshal: 'Фельдмаршал',
        navy_leader: 'Командувач флоту',
      },
      traits: 'Риси',
    },
  },
  equipment: {
    actions: {
      add: 'Додати',
      delete: 'Видалити',
      designModules: 'Налаштувати модулі',
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
    designer: {
      clear: 'Очистити',
      pickerPlaceholder: 'Виберіть модуль',
      required: "Обов'язковий",
      title: 'Налаштувати модулі',
      unfilledWarning: "Цьому обов'язковому слоту не призначено модуль.",
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
    actions: {
      delete: 'Видалити',
      edit: 'Редагувати',
    },
    columns: {
      category: 'Категорія',
      name: 'Назва',
    },
    delete: {
      confirm: 'Видалити',
      message: 'Видалити «{name}»? Цю дію не можна скасувати.',
      title: 'Видалити модуль',
    },
    errors: {
      conflict:
        'Цей модуль змінився на диску після відкриття. Перезавантажте та спробуйте ще раз.',
      forbidden:
        'Цей файл доступний лише для читання та не може бути змінений.',
      notFound: 'Цей модуль більше не існує.',
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
      header: {
        category: 'Категорія',
      },
      removeField: 'Вилучити',
      save: 'Зберегти',
      sections: {
        addAverageStats: 'Середні характеристики (add_average_stats)',
        addStats: 'Додані характеристики (add_stats)',
        multiplyStats: 'Множені характеристики (multiply_stats)',
        scalars: 'Властивості модуля',
      },
      unsavedMessage: 'У вас є незбережені зміни. Відхилити їх?',
      unsavedTitle: 'Незбережені зміни',
      validation: {
        keyDuplicate: 'Дубльований ключ властивості.',
        keyRequired: "Ключ властивості є обов'язковим.",
      },
    },
  },
};
