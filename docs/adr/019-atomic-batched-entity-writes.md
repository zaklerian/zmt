# ADR 019 — Atomic batched scoped deltas for entity writes

- **Status**: Accepted
- **Date**: 2026-06-15

## Update (2026-06-16) — scope widened to an ordered path (ZMT-13)

The scoped-delta write contract originally addressed a delta's scope as `null | string`:
`null` targets the entity's own scalars, and a string names ONE direct child block. The
CHARACTER entity requires writing scalars two levels below the entity root — a role
block's `traits` list, and `portraits -> <group> -> <key>` — which a single child name
cannot address.

- The scope widens from `null | string` to `null | readonly string[]` — an ordered path
  of block names from the entity root. `null` (or the empty path) targets the entity's own
  scalars; each element descends one named child. This is `EntityWriteScope` in
  `libs/r-core/src/entity-form/` and `EntityBlockDelta.block` on the wire in
  `libs/contracts/src/entity/`. It is a breaking change to the `entity:write` channel
  contract, acceptable because every caller is internal.
- The main-side resolver (`writeEntity` in
  `apps/electron/src/main/fs/entity-mutation.service.ts`) descends the path level by level,
  re-binding the target block at each segment, and tracks the deepest assignment for the
  emptied-block guard.
- The descending-offset splice (`applyEdits`) is unaffected — it already tolerates patches
  at any depth within the single buffer, so the atomicity and offset-rebase property of the
  original decision holds for the batch.
- A single-element path is exactly the previous single-child case; the existing module and
  plane delta builders migrate to emit one-element paths with no behavior change.

Depth is bounded by the form layer's two-level nesting cap (ADR 018, as extended on the
same date); the path representation itself carries no artificial limit, but no descriptor
emits a path beyond that cap.

## Context

Entity writes are scoped deltas applied to a lossless parsed node. A delta targets either the node root or a named child block, and is applied by surgical field-level offset patching: only the changed bytes are rewritten, leaving comments, nested blocks, and unrecognized content byte-identical. The contract carries one scope per call. The base scoped-delta write contract shipped during the S-1 entity work as code; it has no standalone ADR (it is referenced only in ledger L-011 and L-012). This ADR formalizes the contract's shape for the case that motivated revisiting it.

A form editing a top-level scalar surface together with one or more named sub-blocks produces several scoped deltas from a single save. Under one-scope-per-call, that save becomes a sequence of independent calls. If a later call in the sequence fails, the file is left partially written — the on-disk entity reflects some of the save's deltas and not others, with no transactional boundary. The corruption is silent: each individual write succeeded.

## Decision

Generalize the contract to accept a batch of scoped deltas in a single call, applied atomically. Either every delta in the batch patches and the file is written once, or none patch and the file is unchanged. The current single-scope shape becomes the one-element batch. Per-scope behavior is unchanged within the batch: a named child block _within the target entity_ is created on its first write and dropped when its last field is removed (this is sub-block creation inside an existing entity, distinct from the deferred top-level entity-create path of ledger L-012).

**Standing verification (resolved at implementation).** Atomicity must be confirmed against the offset-patching implementation before the contract is relied upon. Multiple deltas in one batch patch different byte ranges of the same buffer; the implementation must compute every patch against one coherent snapshot of the node and commit once, never re-reading the file or writing between deltas. Because a delta to an earlier byte range shifts the offsets of every later range, the batch must order or re-base patches so that no patch is computed against offsets a prior patch has already invalidated. This is the central implementation risk and the explicit verification gate for the ticket that lands this contract.

## Consequences

**Positive**

- A save is one transaction. Partial-write corruption from a multi-block save is structurally prevented rather than handled after the fact.
- Existing single-scope callers are behaviorally unaffected and migrate as the trivial one-element batch.
- The transactional boundary stays in the main process, where filesystem authority and the patcher already live. The renderer only assembles the batch and dispatches it.

**Negative / accepted**

- The patcher gains the obligation to reconcile patches whose byte positions shift each other within one buffer. This is the substance of the verification gate; it is real work, not a rename of the existing single-patch path.
- The IPC payload for the write channel changes shape (single scoped delta → array of scoped deltas), a breaking change to that channel's contract. Acceptable: the only current callers are internal and migrate in the same body of work.

## Alternatives considered

- **Keep one scope per call; issue N calls per save.** Rejected — this is the corruption hazard the decision exists to remove. A failed call mid-sequence leaves the file partially written with no rollback.
- **Per-call atomicity flag instead of a batch.** Rejected — atomicity is a property of the whole save, not of one call. A flag does not give the patcher one snapshot to compute against; only batching does.
- **Reconcile partial writes after failure (compensating re-write).** Rejected — reconstructing intended state from a partially written file is more fragile than never writing a partial file. One snapshot, one commit is simpler and correct by construction.
