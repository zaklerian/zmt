import { IncludedMod } from './included-mod.model';

export interface Workspace {
  readonly includedMods: readonly IncludedMod[];
}
