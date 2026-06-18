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

Bare-token list items. A list-of-scalars block — for example a character's `traits` — holds bare value tokens, not `key = value` pairs. A list item is represented as an `EntityField` whose value is absent (`null`/`undefined`), never the empty string. `key = ""` is a legal, distinct empty-string scalar and must round-trip as itself, so the empty string cannot double as the bare-token marker. On serialization: an `EntityField` with an absent value emits a bare token; an `EntityField` with any value, including `""`, emits `key = value`. The wire contract's only widening therefore remains the `block` → path change; list items need no discriminant field.

## Update (2026-06-16, TECHNOLOGY) — positional addressing of repeated same-name blocks

A logical "list of objects" in Paradox script is N repeated same-named blocks on one entity
(`path {} path {} path {}`), parsed as flat, independent sibling nodes with no grouping
concept, and not guaranteed contiguous in source (`path {} folder {} path {}` is legal).
The name-keyed scope from the prior update addresses one named child and stops at the first
match, so it cannot address "the second `path`."

- A scope segment gains an indexed form. `EntityWriteScope` (r-core) and
  `EntityBlockDelta.block` (contracts) become `null | readonly (string | { readonly name:
string; readonly index: number })[]`. A bare-string segment keeps its meaning — the sole
  named child (existing behavior, unchanged). A `{ name, index }` segment selects the
  index-th sibling named `name`. The indexed segment composes with the ordered path, so a
  field two levels below an indexed block is reachable (e.g. `[{ name: 'folder', index: 1 },
'position']`).
- The resolver selects the Nth name-matching sibling rather than breaking on the first; the
  emptied-block guard and the leaf-materialization path tolerate duplicate names.
- Writes stay **item-surgical**, not wholesale. Only the addressed block's changed fields
  are patched; untouched repeated blocks keep their bytes and their comments/trivia. Adding
  or removing a list item inserts or deletes one rendered block. Wholesale re-serialization
  of "all `path` blocks as one region" was rejected: the blocks are non-contiguous in
  general, so a single bounding edit would swallow interleaved keys, and re-rendering from
  the model drops intra-list comments — both fail on normally-formatted files, which a
  lossless editor must not do.
- The duplicate-name guard relaxes **conditionally**: repeated same-name blocks are
  permitted under an object-list (indexed) scope; duplicate scalar keys in a property bag
  are still rejected as a real error. The relaxation is scoped to the object-list case, not
  global — a global relaxation would hide genuine prop-bag key collisions.

Existing entities address blocks with bare-string segments and are unaffected by the type
widening; only the shared resolver descent changes, so existing-entity save parity is the
regression gate.

## Update (2026-06-16, STATE) — materializing absent intermediate blocks

A scoped write may target a path whose INTERMEDIATE block is absent in the file — e.g.
`['buildings', 'naval_base']` on a state that has no `buildings` block at all. The resolver
materialized only the TERMINAL segment; an absent intermediate caused a stale-edit conflict,
which surfaces as a confusing failure when the real intent is "add this nested entry."

- For an ADDED-ONLY delta, the descent now materializes absent intermediate blocks along the
  missing tail — nesting rendered blocks down the path — before applying the add.
- The added-only restriction IS the safety boundary. A `changed` or `removed` delta against
  a missing target stays a stale-edit conflict: there is no existing content to change or
  remove, and materializing a parent to host a change would invent state the file never had.
  Only a pure addition has a well-defined meaning when its container is absent.
- No contract-shape change. The scope path, the indexed segment form, and the delta kinds
  are all unchanged; this completes the materialization behavior, it does not extend the
  contract.

### Enabling change — numeric assignment keys in the parser grammar

STATE's `naval_base` map is keyed by province id (`1234 = 1`), and HOI4 writes those ids
unquoted. The `@paradox-parser` grammar admitted only `Identifier | StringValue` as an
assignment `Key`, and `Identifier` must start with a letter or underscore, so an unquoted
numeric key did not parse as a `key = value` assignment — it degraded to a bare `NumberValue`
token plus a syntax error, making the province → level map unreadable and un-round-trippable.

- The grammar `Key` rule gains `NumberValue` (`Key { Identifier | StringValue | NumberValue }`).
  A numeric key adapts to an `Identifier` node carrying the raw digits as its name, so
  `keyName` reads numeric and letter-led keys uniformly and the write path resolves province
  entries as scalars (surgical change / remove / add), not as bare tokens.
- A bare numeric value with no operator (e.g. a `provinces` id list, `victory_points`
  positional pairs) is unaffected — without a following operator it reduces to a value, not a
  key, so those lossless surfaces keep their existing tokenization.
- Date-shaped keys (the dated `<date> { … }` history event blocks) remain outside `Key` and
  still do not parse as assignments; they stay in the lossless region and carry through a save
  verbatim, unchanged by this extension.

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
