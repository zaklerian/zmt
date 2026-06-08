import { ModId } from './mod-id.model';
import { OpenMod } from './open-mod.model';

export interface Workspace {
  readonly activeModId: ModId | null;
  readonly openMods: readonly OpenMod[];
}
