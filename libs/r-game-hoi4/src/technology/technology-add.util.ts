import { EntityBatchOperation, EntityBlockDelta } from '@contracts';
import { EntityFormLocalisationContext } from '@r-core';

import { technologyNameLocKey } from './technology-loc-keys.util';
import {
  normalizeTechnologyToken,
  resolveTokenCollision,
} from './technology-token.util';

// The block a technology is created under. Every `common/technologies/*.txt` in
// BICE roots its entities in one top-level `technologies = { … }` block, so the
// insert's parent is this name and not the file — the AST strategy addresses a
// PARENT BLOCK, not a file position (ADR 027 decision 4).
export const TECHNOLOGY_PARENT_BLOCK = 'technologies';

// The version suffix a newly inserted technology name key carries — the same '0'
// every technology name key in the ZMT-50 grounding carries.
const INSERT_VERSION = '0';

// Where a new technology's block is written: the editable mod and the
// mod-relative `.txt`, addressed exactly as every other write is (never an
// absolute path from the renderer).
export interface TechnologyAddTarget {
  readonly modId: string;
  readonly relativePath: string;
}

interface TechnologyAddInput {
  // The new block's body, compiled as an ALL-ADDED delta set: the add form diffs
  // its values against a blank snapshot, so every value the user left or typed is
  // an addition. Only `added` and `block` are read downstream — a block that does
  // not exist yet has nothing to change or remove.
  readonly body: readonly EntityBlockDelta[];
  readonly localisation: EntityFormLocalisationContext | undefined;
  readonly publicName: string;
  // The target `.txt` is the user's chosen save target (ADR 029 decision 4) and may
  // not exist yet, so the batch leads with the create-if-absent seed.
  readonly seedTarget: boolean;
  readonly target: TechnologyAddTarget;
  readonly token: string;
}

// The ONE atomic batch an Add commits (ADR 027 + ADR 028 decision 5): the
// technology block inserted into the target `.txt` (an `ast` insert) and its
// localisation name key inserted into the `.yml` (a `loc` insert), all-or-nothing.
//
// The loc half is always an INSERT, never a `set` — a brand-new token owns no key
// anywhere by construction. That is the third ADR 028 D4 case ledger `L-024`
// records, and on Add it is not merely the common case but the only one.
// It is dropped (script-only batch) when the workspace has no editable loc file
// (`defaultTarget === null`, the ADR 028 decision 6 seam) or the user typed no
// public name, rather than guessing a target or writing an empty key.
export function buildTechnologyAddOperations(
  input: TechnologyAddInput,
): readonly EntityBatchOperation[] {
  const { body, localisation, publicName, seedTarget, target, token } = input;
  const script: readonly EntityBatchOperation[] = [
    // ZMT-56's create operation, emitted ONLY for a user-chosen save target (ADR
    // 029 decisions 3 and 6). It is create-IF-ABSENT, so a chosen file that already
    // exists is read and patched like any other; it leads the file's sequence
    // because a create after its content operation is a caller bug the batch
    // rejects rather than reorders.
    ...(seedTarget
      ? ([
          {
            format: 'scriptCreate',
            modId: target.modId,
            relativePath: target.relativePath,
            rootBlocks: [TECHNOLOGY_PARENT_BLOCK],
          },
        ] as const)
      : []),
    {
      deltas: body,
      entityName: token,
      format: 'script',
      insertUnder: TECHNOLOGY_PARENT_BLOCK,
      modId: target.modId,
      relativePath: target.relativePath,
    },
  ];

  const name = publicName.trim();
  const locTarget = localisation?.defaultTarget ?? null;
  if (name === '' || locTarget === null) return script;
  const seedLanguage = localisation?.defaultTargetSeedLanguage ?? null;
  return [
    ...script,
    // The loc half's own create, on the same rule and for the same reason as the
    // script half's: the loc target the lookup resolved may be one the user named
    // in the settings panel, and the language is the one its seed header carries.
    ...(seedLanguage === null
      ? []
      : ([
          {
            format: 'locCreate',
            language: seedLanguage,
            modId: locTarget.modId,
            relativePath: locTarget.relativePath,
          },
        ] as const)),
    {
      deltas: [
        {
          key: technologyNameLocKey(token),
          kind: 'insert',
          value: name,
          version: INSERT_VERSION,
        },
      ],
      format: 'loc',
      modId: locTarget.modId,
      relativePath: locTarget.relativePath,
    },
  ];
}

// The token a new technology is created under (ADR 028 decision 4, at the one
// point where deriving a token is safe — a brand-new technology has no inbound
// references to orphan, which is exactly why the edit path freezes it instead).
//
// A typed token is the user's and is taken VERBATIM: silently suffixing it would
// create an entity under a name they did not choose. A collision on a custom
// token surfaces as the insert strategy's CONFLICT rather than being papered
// over. An empty token field — the default, and what CLEARING the field means —
// autogenerates from the public name and suffixes `_2`, `_3`, … past a collision
// (ledger `L-023`: suffix, never reject).
export function resolveTechnologyAddToken(
  customToken: string,
  publicName: string,
  takenIds: readonly string[],
): string {
  const custom = customToken.trim();
  if (custom !== '') return custom;
  return resolveTokenCollision(normalizeTechnologyToken(publicName), takenIds);
}
