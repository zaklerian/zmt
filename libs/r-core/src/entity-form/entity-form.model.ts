import { TranslateFn } from '../recognizer';
import { EntityFormBlock } from './entity-form-block.model';

// A per-(game, entity) form descriptor. Mirrors the read-side recognizer as a
// code module, registered host-side and kept separate from the recognizer
// registry; the two share only the entity-identifier constant (`entityId` ===
// the recognizer's `id`). Concrete descriptors live in the per-game library.
// `project` accepts the subject type-erased so the host registry can store and
// invoke descriptors uniformly; use `defineEntityFormDescriptor` for a
// subject-typed projection.
export interface EntityFormDescriptor {
  readonly entityId: string;
  readonly gameId: string;
  readonly project: (
    subject: unknown,
    context: EntityFormProjectContext,
  ) => EntityFormModel;
}

// The shell's single, entity-agnostic input. A descriptor projects a domain
// entity into this; the host's mod-descriptor view builds it directly. The
// shell renders the blocks, wires RHF, tracks dirty, runs the resolver, guards
// unsaved changes, and dispatches `save` — carrying no entity-specific
// knowledge of its own.
export interface EntityFormModel {
  readonly blocks: readonly EntityFormBlock[];
  // Resolved title for the modal-dialog form chrome (entity name).
  readonly dialogTitle?: string;
  // Resolved error chrome. `errorMessage` maps an IpcError numeric code to a
  // user-facing string (display-layer mapping per R-CODE-5, not invention).
  readonly errorMessage: (code: number) => string;
  readonly errorTitle: string;
  // Resolved muted note beside the dialog title (e.g. a module's category).
  readonly note?: string;
  // Persist edited values. Rejects with an IpcError on failure. The shell
  // awaits this, clears dirty on success, and surfaces the error while keeping
  // dirty on failure. May return the next values to reset to (a reparse
  // round-trip); otherwise the shell resets to the submitted values.
  readonly save: (values: EntityFormValues) => Promise<EntityFormValues | void>;
  // Externally-supplied Zod schema (the mod-descriptor plugin-extension path).
  // Typed `unknown` to keep r-core free of a Zod dependency — the shell casts
  // to its resolver input. Absent → the shell generates a schema from the
  // blocks' field specs.
  readonly schema?: () => unknown;
}

// Capabilities the host supplies to a descriptor's projection at present time.
export interface EntityFormProjectContext {
  readonly modId: string;
  readonly relativePath: string;
  readonly translate: TranslateFn;
}

// The flat RHF value object. Keys are block bindings: a field-array name for
// open / named-nested bags and list blocks, a root field name for each fixed
// field. The descriptor that built the blocks owns the shape on save.
export type EntityFormValues = Readonly<Record<string, unknown>>;

// Builds a descriptor with a subject-typed `project` while keeping the stored
// shape type-erased. The recast is contained here — the descriptor is only ever
// invoked with the subject the matching recognizer produced.
export function defineEntityFormDescriptor<TSubject>(descriptor: {
  readonly entityId: string;
  readonly gameId: string;
  readonly project: (
    subject: TSubject,
    context: EntityFormProjectContext,
  ) => EntityFormModel;
}): EntityFormDescriptor {
  return {
    entityId: descriptor.entityId,
    gameId: descriptor.gameId,
    project: (subject, context) =>
      descriptor.project(subject as TSubject, context),
  };
}
