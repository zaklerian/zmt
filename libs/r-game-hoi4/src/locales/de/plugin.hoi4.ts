import type { en } from '../en/plugin.hoi4';

export const de: typeof en = {
  character: {
    actions: {
      edit: 'Bearbeiten',
    },
    columns: {
      name: 'Name',
      roles: 'Rollen',
    },
    errors: {
      conflict:
        'Dieser Charakter wurde auf der Festplatte geändert, seit Sie ihn geöffnet haben. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Dieser Charakter existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      fields: {
        name: 'Name',
      },
      portraits: {
        army: 'Heeresporträts',
        civilian: 'Zivilporträts',
        navy: 'Marineporträts',
        title: 'Porträts',
      },
      roleBags: {
        modifier: 'Modifikatoren',
        research_bonus: 'Forschungsboni',
        skills: 'Fähigkeiten',
      },
      roles: {
        advisor: 'Berater',
        corps_commander: 'Korpskommandeur',
        country_leader: 'Staatsführer',
        field_marshal: 'Feldmarschall',
        navy_leader: 'Flottenkommandant',
        scientist: 'Wissenschaftler',
      },
      traits: 'Eigenschaften',
    },
  },
  equipment: {
    actions: {
      add: 'Hinzufügen',
      delete: 'Löschen',
      designModules: 'Module entwerfen',
      edit: 'Bearbeiten',
    },
    columns: {
      domain: 'Bereich',
      kind: 'Art',
      name: 'Name',
      type: 'Typ',
    },
    delete: {
      confirm: 'Löschen',
      message:
        'Möchten Sie „{name}“ löschen? Dies kann nicht rückgängig gemacht werden.',
      title: 'Ausrüstung löschen',
    },
    designer: {
      clear: 'Löschen',
      pickerPlaceholder: 'Modul auswählen',
      required: 'Erforderlich',
      title: 'Module entwerfen',
      unfilledWarning: 'Diesem erforderlichen Slot ist kein Modul zugewiesen.',
    },
    domain: {
      air: 'Luft',
      land: 'Land',
      naval: 'Marine',
    },
    errors: {
      conflict:
        'Diese Ausrüstung wurde seit dem Öffnen auf der Festplatte geändert. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Diese Ausrüstung existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      addField: 'Feld hinzufügen',
      cancel: 'Abbrechen',
      discard: 'Verwerfen',
      fields: {
        key: {
          label: 'Eigenschaft',
        },
        value: {
          label: 'Wert',
        },
      },
      removeField: 'Entfernen',
      save: 'Speichern',
      unsavedMessage: 'Sie haben nicht gespeicherte Änderungen. Verwerfen?',
      unsavedTitle: 'Nicht gespeicherte Änderungen',
      validation: {
        keyDuplicate: 'Doppelter Eigenschaftsschlüssel.',
        keyRequired: 'Eigenschaftsschlüssel ist erforderlich.',
      },
    },
    kind: {
      archetype: 'Archetyp',
      regular: 'Regulär',
    },
    status: {
      invalid: 'Ungültig',
      unresolved: 'Archetyp nicht gefunden',
    },
  },
  ideology: {
    actions: {
      edit: 'Bearbeiten',
    },
    columns: {
      name: 'Name',
      types: 'Unterideologien',
    },
    errors: {
      conflict:
        'Diese Ideologie wurde auf der Festplatte geändert, seit Sie sie geöffnet haben. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Diese Ideologie existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      dynamicFactionNames: {
        label: 'Dynamische Fraktionsnamen',
      },
      factionModifiers: {
        title: 'Fraktionsmodifikatoren',
      },
      fields: {
        ai_communist: 'KI kommunistisch',
        ai_democratic: 'KI demokratisch',
        ai_fascist: 'KI faschistisch',
        ai_neutral: 'KI neutral',
        can_be_boosted: 'Kann verstärkt werden',
        can_collaborate: 'Kann kollaborieren',
        can_host_government_in_exile: 'Kann Exilregierung beherbergen',
        faction_impact_on_world_tension:
          'Fraktionseinfluss auf die Weltspannung',
        war_impact_on_world_tension: 'Kriegseinfluss auf die Weltspannung',
      },
      modifiers: {
        title: 'Modifikatoren',
      },
      rules: {
        title: 'Regeln',
      },
      types: {
        add: 'Unterideologie hinzufügen',
        key: 'Unterideologie-Schlüssel',
        title: 'Unterideologien (types)',
      },
    },
  },
  module: {
    actions: {
      delete: 'Löschen',
      edit: 'Bearbeiten',
    },
    columns: {
      category: 'Kategorie',
      name: 'Name',
    },
    delete: {
      confirm: 'Löschen',
      message:
        'Möchten Sie „{name}“ löschen? Dies kann nicht rückgängig gemacht werden.',
      title: 'Modul löschen',
    },
    errors: {
      conflict:
        'Dieses Modul wurde seit dem Öffnen auf der Festplatte geändert. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Dieses Modul existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      addField: 'Feld hinzufügen',
      cancel: 'Abbrechen',
      discard: 'Verwerfen',
      fields: {
        key: {
          label: 'Eigenschaft',
        },
        value: {
          label: 'Wert',
        },
      },
      header: {
        category: 'Kategorie',
      },
      removeField: 'Entfernen',
      save: 'Speichern',
      sections: {
        addAverageStats: 'Durchschnittswerte (add_average_stats)',
        addStats: 'Additive Werte (add_stats)',
        buildCostResources: 'Baukosten (build_cost_resources)',
        dismantleCostResources: 'Abrisskosten (dismantle_cost_resources)',
        multiplyStats: 'Multiplikative Werte (multiply_stats)',
        scalars: 'Moduleigenschaften',
      },
      unsavedMessage: 'Sie haben nicht gespeicherte Änderungen. Verwerfen?',
      unsavedTitle: 'Nicht gespeicherte Änderungen',
      validation: {
        keyDuplicate: 'Doppelter Eigenschaftsschlüssel.',
        keyRequired: 'Eigenschaftsschlüssel ist erforderlich.',
      },
    },
  },
  state: {
    actions: {
      edit: 'Bearbeiten',
    },
    columns: {
      category: 'Kategorie',
      id: 'ID',
      name: 'Name',
      provinces: 'Provinzen',
    },
    errors: {
      conflict:
        'Dieser Staat wurde seit dem Öffnen auf der Festplatte geändert. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Dieser Staat existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    },
    form: {
      buildings: {
        add: 'Provinz hinzufügen',
        key: 'Provinz-ID',
        title: 'Gebäude',
      },
      fields: {
        id: 'ID',
        impassable: 'Unpassierbar',
        local_supplies: 'Lokaler Nachschub',
        manpower: 'Arbeitskräfte',
        name: 'Name',
        state_category: 'Staatskategorie',
      },
      history: {
        title: 'Geschichte (Besitzer / Kontrolleur)',
      },
      provinces: {
        label: 'Provinzen',
      },
      resources: {
        title: 'Ressourcen',
      },
    },
  },
  technology: {
    actions: {
      edit: 'Bearbeiten',
    },
    columns: {
      categories: 'Kategorien',
      name: 'Name',
      paths: 'Pfade',
    },
    errors: {
      conflict:
        'Diese Technologie wurde auf der Festplatte geändert, seit Sie sie geöffnet haben. Neu laden und erneut versuchen.',
      forbidden:
        'Diese Datei ist schreibgeschützt und kann nicht geändert werden.',
      notFound: 'Diese Technologie existiert nicht mehr.',
      title: 'Aktion fehlgeschlagen',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    },
    form: {
      addTitle: 'Neue Technologie',
      fields: {
        doctrine: 'Doktrin',
        doctrine_name: 'Doktrinname',
        publicName: 'Öffentlicher Name',
        research_cost: 'Forschungskosten',
        show_equipment_icon: 'Ausrüstungssymbol anzeigen',
        start_year: 'Startjahr',
        token: 'Token (leer = automatisch)',
      },
      folder: {
        add: 'Ordner hinzufügen',
        item: 'Ordner',
        name: 'Name',
        title: 'Ordner',
      },
      path: {
        add: 'Pfad hinzufügen',
        item: 'Pfad',
        leads_to_tech: 'Führt zu Technologie',
        research_cost_coeff: 'Forschungskostenkoeffizient',
        title: 'Pfade',
      },
      position: {
        title: 'Position',
        x: 'X',
        y: 'Y',
      },
      refLists: {
        categories: 'Kategorien',
        dependencies: 'Abhängigkeiten',
        enableEquipmentModules: 'Ausrüstungsmodule freischalten',
        enableEquipments: 'Ausrüstungen freischalten',
        enableSubunits: 'Untereinheiten freischalten',
        xor: 'Gegenseitig ausschließend (xor)',
      },
    },
    symbolWarning: {
      cancel: 'Abbrechen',
      confirm: 'Trotzdem speichern',
      message:
        'Beim Speichern werden diese Substitutionskonstanten durch einfache Literale ersetzt, wodurch die Bindung an dieser Stelle verloren geht:',
      title: 'Substitutionskonstanten ersetzen?',
    },
  },
};
