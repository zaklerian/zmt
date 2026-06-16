import { FieldSpec } from '@r-core';

// Field specs for the technology edit form. Only file-local intrinsic values
// carry a closed spec; cross-entity values (`leads_to_tech`, `doctrine_name`, the
// ref-list items) stay free-text (R-CODE-5). Order is the render order (semantic,
// R-CODE-9 carve-out).

// Root scalar fields. `doctrine` and `show_equipment_icon` are booleans (rendered
// as yes/no selects); the rest are free-text.
export const TECHNOLOGY_ROOT_SPECS: readonly FieldSpec[] = [
  'research_cost',
  'start_year',
  { name: 'doctrine', validation: { type: 'boolean' } },
  'doctrine_name',
  { name: 'show_equipment_icon', validation: { type: 'boolean' } },
];

// `path` item scalar fields.
export const TECHNOLOGY_PATH_SPECS: readonly FieldSpec[] = [
  'leads_to_tech',
  'research_cost_coeff',
];

// `folder` item scalar fields.
export const TECHNOLOGY_FOLDER_SPECS: readonly FieldSpec[] = ['name'];

// `folder` item nested `position` object's scalar fields.
export const TECHNOLOGY_POSITION_SPECS: readonly FieldSpec[] = ['x', 'y'];

// Bare-token ref-lists: the TechnologyEntity property, the source block name (=
// write scope + RHF binding), and the locale-key suffix. Render order is
// meaningful, so it is kept rather than alphabetized (R-CODE-9 carve-out).
export interface TechnologyRefList {
  readonly entityKey:
    | 'categories'
    | 'dependencies'
    | 'enableEquipmentModules'
    | 'enableEquipments'
    | 'enableSubunits'
    | 'xor';
  readonly name: string;
}

export const TECHNOLOGY_REF_LISTS: readonly TechnologyRefList[] = [
  { entityKey: 'dependencies', name: 'dependencies' },
  { entityKey: 'xor', name: 'xor' },
  { entityKey: 'categories', name: 'categories' },
  { entityKey: 'enableEquipments', name: 'enable_equipments' },
  { entityKey: 'enableEquipmentModules', name: 'enable_equipment_modules' },
  { entityKey: 'enableSubunits', name: 'enable_subunits' },
];
