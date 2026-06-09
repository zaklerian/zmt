import { ModId } from './mod-id.model';

export interface IncludedMod {
  readonly id: ModId;
  readonly name: string;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}
