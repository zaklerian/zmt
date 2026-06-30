import type { en } from '../en/plugin.hoi4';

export const uk: typeof en = {
  character: {
    actions: {
      edit: 'Редагувати',
    },
    columns: {
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
        name: 'Імʼя',
      },
      portraits: {
        army: 'Портрети армії',
        civilian: 'Цивільні портрети',
        navy: 'Портрети флоту',
        title: 'Портрети',
      },
      roleBags: {
        modifier: 'Модифікатори',
        research_bonus: 'Дослідницькі бонуси',
        skills: 'Навички',
      },
      roles: {
        advisor: 'Радник',
        corps_commander: 'Командир корпусу',
        country_leader: 'Лідер країни',
        field_marshal: 'Фельдмаршал',
        navy_leader: 'Командувач флоту',
        scientist: 'Науковець',
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
  ideology: {
    actions: {
      edit: 'Редагувати',
    },
    columns: {
      name: 'Назва',
      types: 'Підідеології',
    },
    errors: {
      conflict:
        'Ця ідеологія змінилася на диску відколи ви її відкрили. Перезавантажте та спробуйте знову.',
      forbidden:
        'Цей файл доступний лише для читання та не може бути змінений.',
      notFound: 'Ця ідеологія більше не існує.',
      title: 'Дію не виконано',
      unknown: 'Щось пішло не так. Будь ласка, спробуйте ще раз.',
    },
    form: {
      dynamicFactionNames: {
        label: 'Динамічні назви фракцій',
      },
      factionModifiers: {
        title: 'Модифікатори фракції',
      },
      fields: {
        ai_communist: 'ШІ комуністичний',
        ai_democratic: 'ШІ демократичний',
        ai_fascist: 'ШІ фашистський',
        ai_neutral: 'ШІ нейтральний',
        can_be_boosted: 'Можна підсилити',
        can_collaborate: 'Може співпрацювати',
        can_host_government_in_exile: 'Може мати уряд у вигнанні',
        faction_impact_on_world_tension: 'Вплив фракції на світову напругу',
        war_impact_on_world_tension: 'Вплив війни на світову напругу',
      },
      modifiers: {
        title: 'Модифікатори',
      },
      rules: {
        title: 'Правила',
      },
      types: {
        add: 'Додати підідеологію',
        key: 'Ключ підідеології',
        title: 'Підідеології (types)',
      },
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
        buildCostResources: 'Вартість будівництва (build_cost_resources)',
        dismantleCostResources: 'Вартість демонтажу (dismantle_cost_resources)',
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
  state: {
    actions: {
      edit: 'Редагувати',
    },
    columns: {
      category: 'Категорія',
      id: 'Ідентифікатор',
      name: 'Назва',
      provinces: 'Провінції',
    },
    errors: {
      conflict:
        'Цей штат змінився на диску з моменту відкриття. Перезавантажте та спробуйте ще раз.',
      forbidden: 'Цей файл доступний лише для читання і не може бути змінений.',
      notFound: 'Цей штат більше не існує.',
      title: 'Дію не виконано',
      unknown: 'Щось пішло не так. Будь ласка, спробуйте ще раз.',
    },
    form: {
      buildings: {
        add: 'Додати провінцію',
        key: 'Ідентифікатор провінції',
        title: 'Будівлі',
      },
      fields: {
        id: 'Ідентифікатор',
        impassable: 'Непрохідний',
        local_supplies: 'Місцеве постачання',
        manpower: 'Жива сила',
        name: 'Назва',
        state_category: 'Категорія штату',
      },
      history: {
        title: 'Історія (власник / контролер)',
      },
      provinces: {
        label: 'Провінції',
      },
      resources: {
        title: 'Ресурси',
      },
    },
  },
  technology: {
    actions: {
      edit: 'Редагувати',
    },
    columns: {
      categories: 'Категорії',
      name: 'Назва',
      paths: 'Шляхи',
    },
    errors: {
      conflict:
        'Ця технологія змінилася на диску відколи ви її відкрили. Перезавантажте та спробуйте ще раз.',
      forbidden: 'Цей файл доступний лише для читання і не може бути змінений.',
      notFound: 'Ця технологія більше не існує.',
      title: 'Не вдалося виконати дію',
      unknown: 'Щось пішло не так. Будь ласка, спробуйте ще раз.',
    },
    form: {
      fields: {
        doctrine: 'Доктрина',
        doctrine_name: 'Назва доктрини',
        research_cost: 'Вартість дослідження',
        show_equipment_icon: 'Показувати значок спорядження',
        start_year: 'Рік початку',
      },
      folder: {
        add: 'Додати теку',
        item: 'Тека',
        name: 'Назва',
        title: 'Теки',
      },
      path: {
        add: 'Додати шлях',
        item: 'Шлях',
        leads_to_tech: 'Веде до технології',
        research_cost_coeff: 'Коефіцієнт вартості дослідження',
        title: 'Шляхи',
      },
      position: {
        title: 'Позиція',
        x: 'X',
        y: 'Y',
      },
      refLists: {
        categories: 'Категорії',
        dependencies: 'Залежності',
        enableEquipmentModules: 'Увімкнути модулі спорядження',
        enableEquipments: 'Увімкнути спорядження',
        enableSubunits: 'Увімкнути підрозділи',
        xor: 'Взаємовиключні (xor)',
      },
    },
  },
};
