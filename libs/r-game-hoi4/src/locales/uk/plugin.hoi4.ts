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
    domain: {
      air: 'Повітря',
      land: 'Суша',
      naval: 'Флот',
    },
    status: {
      invalid: 'Недійсний',
      unresolved: 'Архетип не знайдено',
    },
  },
};
