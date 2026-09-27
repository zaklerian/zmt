import type { DeepReadonly } from './deep-readonly.model';
import type { EN_MESSAGES } from './en.const';

export type Messages = DeepReadonly<typeof EN_MESSAGES>;
