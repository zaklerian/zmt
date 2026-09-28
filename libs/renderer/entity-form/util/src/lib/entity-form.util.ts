import { pending } from '@zmt/renderer/pending/util';

import type { EntityFormBlock } from './entity-form-block.model';
import type { EntityFormValues } from './entity-form.model';

export function blockKey(block: EntityFormBlock, index: number): string {
  switch (block.kind) {
    case 'listOfScalars':
    case 'namedNested':
    case 'objectList':
      return block.name;
    case 'propertyBag':
      return block.members.mode === 'open' ? block.members.name : `fixed-${String(index)}`;
    default:
      return block satisfies never;
  }
}

export const buildEntityFormDefaults: (
  blocks: readonly EntityFormBlock[],
) => EntityFormValues = () => pending('ZMT-A-5');
