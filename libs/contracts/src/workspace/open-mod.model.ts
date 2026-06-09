import { ModId } from './mod-id.model';

export interface OpenMod {
  readonly id: ModId;
  readonly name: string;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}
