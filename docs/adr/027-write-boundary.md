# ADR 027 — Write boundary: format strategies and cross-file atomic batch

- **Status**: Accepted
- **Date**: 2026-08-11

_The write path today (ADR 019) edits one Clausewitz `.txt` file per call, as a scoped-delta
batch of byte-range patches applied atomically to that one file. The editable tech-tree (TL)
surface breaks all three of its assumptions at once: it must edit more than one format (Clausewitz
`.txt`, localisation `.yml`, later `.gui`), touch more than one file per operation (delete-tree,
move-entity, `@`-var inline-on-delete), and create — not only patch — named blocks. This records
the write boundary that generalizes ADR 019: a write is `{ file, format, delta }`, one service
routing each operation to a pluggable format strategy, applied as a cross-file all-or-nothing batch
with an honestly-bounded rollback. It supersedes ADR 019, closes ledger L-012, and is designed
Electron-free so the write logic is verifiable in a CC session — the earlier "gate 3 needs
Electron" framing was the harness's service-graph construction and full-corpus perf ceiling, not
the write logic, and this ADR corrects it. It is additive to ADR 013, 014, 016, 020, 022, and 024._

## Update (2026-09-02) — `create` is a batch operation kind, and its rollback is unlink (ZMT-56)

This is the amendment [ADR 029](029-write-target-resolution.md) decision 6 names and requires of
decision 3. It lands here, against the shipped strategy code, rather than as prose written ahead
of it.

**Why it is needed.** ADR 029 makes a save-target possibly a **new file**, and "created empty on
first write" does not survive the code: there are three throw sites, and an empty file trips all
of them. The batch reads every target first and turns `ENOENT` into `NOT_FOUND` (`readSource`,
`write-batch.service.ts`); the AST insert throws `NOT_FOUND` when the parent block it inserts under
is absent (`applyInsertDelta`, `ast-scoped-delta.strategy.ts`), and the technology insert names
`technologies` as that parent; the loc insert **appends** a key line and synthesizes neither the
UTF-8 BOM nor the `l_<language>:` header, producing a file the engine will not read. Creating the
file **before** the batch is worse, not better — every failed batch then leaves a stray file behind,
and the file's own creation escapes the path-guard and the rollback the batch already provides.

**The amendment.** Decision 3's two-phase model gains a **third operation kind** alongside the two
content kinds of decision 4 (patch / insert / delete):

- **`create`** — an operation declares its target **create-if-absent**, seeded with its format's
  minimum valid content. Phase 1 stages the seeded-then-patched bytes exactly as it stages any other
  target, through the same path guard, byte ceiling, and serialize-back gate; phase 2 renames.
  Create-**if-absent**: a target that already exists is read and patched like any other, so a stale
  target that reappeared is an ordinary edit and never an overwrite of the user's file.
- **The rollback verb branches on how the file got there.** A pre-existing file is restored from its
  backup, unchanged. A file the batch **created** is **unlinked** — there is no original to restore,
  and a backup was never taken, so "leave the tree as it began" means the file is not there at all.
  This is the one behavioral change to decision 3; the guarantee and its residual window are
  otherwise identical.
- **`assertOneOperationPerFile` admits create-then-content on one file.** The invariant it enforces
  is unchanged — two **content** operations on a path would each stage from the on-disk original and
  the second temp-write would silently drop the first's edit. A create paired with the content
  operation that fills the file it seeds is not two stagings: the seed is supplied in memory and the
  content operation applies **to it**, so the file is never read twice. It is the ordered-per-file
  sequence ZMT-52 established, one level up: a file's plan is at most one create followed by at most
  one content operation, and a create listed **after** its content operation is rejected rather than
  silently reordered.

**What the seed is, and whose it is.** The seed is the **format strategy's** to render, for the same
reason reading and serializing are — it is that format's byte shape:

- **loc-lines** → the UTF-8 BOM plus the `l_<language>:` header, terminated. Grounded on BICE, not
  assumed: all 190 `localisation/english/*.yml` files open with `ef bb bf`, and 170 of them follow it
  with exactly `l_english:` (`docs/grounding/ZMT-48-loc-format-grounding.md`).
- **AST** → **the empty string is the format minimum** — `parse('')` returns zero errors, verified.
  The seed's actual content is therefore **not** a format requirement but the **parent block** the
  insert addresses, which is per **write-kind**, not per format (`technologies` for a technology
  `.txt`, `spriteTypes` for a `.gfx`). The create operation carries it, which is the shape ADR 029
  decision 3 predicts when it calls the seed "the second thing a kind registers after its folder".

  This is a divergence from ADR 029 decision 3's wording, which reads as though `technologies = { }`
  were the format's minimum. It is not; the empty file is. Recorded here rather than resolved
  silently — the decision is unchanged, its reason is.

**Accepted, and stated because it is a real edge.** A created file's parent directory is created
recursively in phase 1 (the temp file is a sibling of the target, so it must exist), and it is **not**
removed on rollback. An empty directory is not the partial file the guarantee is about, and unwinding
it would race any other operation writing beside it.

Sprite and geometry create paths inherit this kind by registering a seed; `create` is format-generic
and needs no per-kind mechanism.

## Context

`entity-mutation.service` is the single write path today (ADR 019, project map: "the **only** write
path"). Read against the code, it has exactly the three limits the TL surface breaks — and two
facts that shape how far the generalization has to reach:

**One format.** `writeEntity` / `deleteEntity` in `apps/electron/src/main/fs/entity-mutation.service.ts`
parse the target with the Clausewitz grammar (`@paradox-parser`) and patch byte ranges on the parsed
AST via `applyEdits` (a descending-offset splice — `entity-mutation.service.ts:47`). This edits
Clausewitz `.txt` only. The TL surface must also write **localisation**, which is a different format
entirely: `localisation/<lang>/*.yml` in BICE is UTF-8-BOM'd, line-oriented `KEY:VERSION "value"`
(e.g. `l_english:` then ` STAT_VALUE:0 "$VALUE|0H%$"`), with a leading-space indent and a numeric
version suffix on each key. The `.yml` extension is a misnomer — it is **not** YAML, and the
Clausewitz parser does not read it. `.gui` comes later.

**One file.** `EntityWriteRequest` and `EntityDeleteRequest` (`libs/contracts/src/entity/`) each name
a single `relativePath`; the resolver loads, patches, and writes that one file. TL writes span files:
delete-tree (N technology files + localisation + sprite references), move-entity (insert into one
file, delete from another), and `@`-var inline-on-delete (rewrite N call-sites across files, ledger
L-015). Each of these is meaningless unless it is all-or-nothing across every file it touches.

**Patch only.** The Add action is stubbed (ledger L-012). The insert of a **new named block** is,
however, already **partially present**: `renderCoalescedBlocks` (`entity-mutation.service.ts:174`)
renders absent tails as nested `<head> = { … }` blocks, and the batch's materialization loop inserts
them **before the parent block's closing brace** (`entity-mutation.service.ts:454-469`, computed at
`lineStartOf(source, parent.to - 1)` and rebased by `applyEdits`). That path materializes a sub-block
**inside an existing entity**; it is not the top-level entity-create that L-012 tracks, and ADR 019
itself draws that line ("sub-block creation inside an existing entity, distinct from the deferred
top-level entity-create path of ledger L-012").

Two verified facts shape the decisions:

- **The write path is pure Node `fs` at the file layer.** `write-file.service.ts` imports only
  `node:fs`, `node:crypto`, `node:path`, and `@contracts` — no `electron`. `entity-mutation.service`
  likewise imports no `electron`. The earlier "the write gate needs Electron" was imprecise: what
  needed the binary or timed out (~560s on the full corpus) was the harness's **service-graph
  construction** and its **full-corpus perf ceiling**, not the write logic. Write correctness is
  therefore verifiable in-session. **The one honest caveat**, recorded so decision 6 is a real change
  and not a restatement: `entity-mutation.service` reaches two Electron-coupled singletons **indirectly**
  today — `workspaceStoreService.get()` to resolve a mod's path from its `modId`
  (`workspace-store.service.ts` imports `electron-store`), and `pluginRegistryService.list()` for the
  parser dialects. The file I/O is pure Node; the **config lookups** are not. Decision 6 requires the
  batch service to take that config as parameters instead.
- **`atomicWrite` already does temp-write + rename + path-guard for one file.** `write-file.service.ts:42`
  asserts the path is writable (`assertWritable`, the ADR-014/A-ELECTRON-2 guard), checks the byte
  length against `MAX_PAYLOAD_BYTES`, writes to a `.{base}.{suffix}.tmp` temp file **in the same parent
  directory** (so the rename stays same-filesystem and atomic), then `fs.rename`s it into place, cleaning
  up the temp on failure. The batch **generalizes** this one-file primitive across files; it does not
  invent it.

## Decision

### 1. A write is `{ file, format, delta }`; one service, pluggable format strategies

The unit of write is `{ file, format, delta }`. One write service routes each operation to the
**format strategy** for that file's format, and applies a set of operations as one batch (decision 3).
This supersedes ADR 019's single-format assumption — ADR 019's contract is the one-file, one-format,
Clausewitz special case of this boundary. It is the concrete form of the "one write service, pluggable
serializers" direction (Q2): the routing key is the file's format, and the strategy owns reading,
applying the delta, and serializing back for that format.

The **read/write asymmetry of ADR 024 decision 1 is preserved and sharpened**: a read fans out across
sources and merges; a write targets the **editable source that owns the entity** (decision 5). This
boundary is the write half of that split — the provenance ADR 024 puts on a read row is exactly what
routes an operation to its editable owner file.

### 2. Two format strategies — and a rejected third

Two strategies, chosen by format, not three:

- **AST-scoped-delta** — Clausewitz `.txt` **and** `.gui` / `.gfx`. These share the `@paradox-parser`
  grammar and the same byte-range-edit-on-parsed-nodes mechanism (`applyEdits`) that ADR 019 already
  ships. `.gui` is Clausewitz-family; it is **not** given its own strategy. Recorded as the rejected
  split: a third strategy for `.gui` would duplicate the AST strategy for a format that parses on the
  same grammar and serializes on the same offset-splice.
- **loc-lines** — localisation `.yml`. Line-oriented and **lossless**: it preserves the BOM, key order,
  comments, blank lines, the `KEY:VERSION` numeric version suffix, and the quoting/escaping of values.
  The Clausewitz strategy cannot serve this — loc is not Clausewitz script; it is its own reader and
  writer. This is a genuinely second format, and it is why the boundary is strategy-pluggable rather
  than one hard-coded serializer.

The strategy count is set by **format family**, not file extension: `.txt` and `.gui`/`.gfx` are one
family (one strategy), `.yml` loc is another (one strategy). Two families, two strategies.

### 3. Cross-file atomic batch: two-phase temp-write + rename, rollback via backups

A batch is a set of `{ file, format, delta }` operations applied **all-or-nothing** across every file
it touches. It runs in two phases:

- **Phase 1 — apply and stage.** For each operation, apply its delta in memory (via the operation's
  format strategy) and **temp-write** every target file to a sibling temp file. Validate everything
  here: `path-guard` on every target, byte-length ceiling, and a **serialize-back check** per strategy
  (the loc-lines round-trip, the AST re-emit). Phase 1 performs **all** the work that can fail for a
  content or path reason; nothing is renamed yet.
- **Phase 2 — commit.** Rename every staged temp file into place. Before each rename, **back up** the
  original file. If any rename in phase 2 fails, **restore** the already-renamed files from their
  backups.

**The guarantee, stated with its limit.** True multi-file ACID is **impossible** on a filesystem the
tool does not own — there is no cross-file transaction primitive on a POSIX/NTFS mod directory. What
this batch guarantees is: either every file lands, or (on a phase-1 failure) none is touched, or (on a
phase-2 failure) the already-committed files are rolled back from backups. The **residual window** is a
phase-2 rename failing _after_ an earlier rename in the same batch already succeeded; recovery is
backup-restore, and the window is **minimized by construction** — all writes, validation, and
serialize-back checks live in phase 1, so phase 2 is nothing but fast renames, the operation least
likely to fail partway. This supersedes ADR 019's **per-file** atomicity with **per-batch** atomicity,
and the residual window and its recovery are **documented, not hidden**. This is cross-file
transactionality on a non-transactional substrate: the guarantee is stated, and so is its edge.

**Rejected alternatives** (recorded so they are not re-proposed):

- **Staging-directory atomic swap** — stage the whole edit in a shadow directory and swap it in.
  Rejected: an atomic directory swap is filesystem- and mount-dependent (it is not atomic across a
  bind mount, a network share, or a case-insensitive volume), and the tool writes into an arbitrary
  user mod directory it does not control.
- **Journal / write-ahead log** — a durable intent log replayed on crash. Rejected as overkill for
  user-initiated desktop edits: the failure this must survive is a mid-batch rename error, not a power
  loss mid-transaction on a database. Backup-restore over a phase-2 that is only renames is proportional;
  a WAL is a database's answer to a problem this boundary does not have.

### 4. Insert/create is a delta kind (closes L-012)

The AST strategy supports **inserting a new named block into an existing parent block**, extending the
partial insert already present (`renderCoalescedBlocks` + the before-closing-brace materialization,
Context above). A batch operation is therefore one of:

- **Clausewitz (AST):** patch an existing block, **insert a new block**, or delete a block.
- **loc-lines:** set an existing key line, **insert a key line**, or delete a key line.

This **closes ledger L-012** (the entity create/insert contract): the Add action, stubbed because
`entity:write` patched existing blocks only, now has an insert delta kind to compile to. Move-entity
(insert in one file + delete in another, ledger L-011) and `@`-var inline-on-delete (ledger L-015)
become **compositions** of these delta kinds across a batch — they are **unblocked** by this boundary
but are **not** closed here; each lands on its own ticket. Only L-012 closes.

### 5. Provenance routes writes to the editable owner; edit-of-vanilla is create-override

A read entity carries provenance (ADR 024: `sourceId`, `shadowedSourceIds`, `reason`, joined to the
`SourcesTable` for `permission`). A write **targets the editable source that owns the entity, never a
readonly (vanilla) source**. Two cases:

- **Patch-editable** — the entity's winning source is editable. The write patches that file. This is
  the **first cut**, and it is what the PoC needs: **verified against BICE**, the air technologies the
  canvas edits are defined **in BICE's own files** (`common/technologies/air_techs.txt`, `air_doctrine.txt`,
  and the per-nation `ENG_air.txt` / `GER_air.txt` / `SOV_air.txt` / … ), i.e. the editable source owns
  them. So the plane technologies resolve to an editable owner and no create-override is required to
  ship the PoC.
- **Create-override** — editing a **vanilla-only** entity. The engine's modding convention is that you
  do not edit vanilla in place; you write an override into the active mod. Here that is an **insert**
  (decision 4) into the mod's owning file. The **routing is designed now**; the **implementation is
  deferred** until a real vanilla-only editable target requires it — which, per the BICE verification
  above, the plane PoC does not.

Rejected: **erroring on edit-of-vanilla.** That leaves a visible, selectable tree node uneditable with
no path forward — the provenance says "vanilla," and the tool would simply refuse. Create-override is
the convention-correct answer and is the designed path; erroring is a dead end.

### 6. The write boundary is Electron-free by design; correctness is verified in-session

The batch service, both format strategies, and the temp-write / rename / rollback are **pure Node `fs`**.
Any Electron-coupled config — the workspace's editable-source paths, preferences — is **passed in as
plain parameters**, not reached through `electron-store` inside the write path. This is a **design
requirement and a correction**, not a restatement of the status quo: today `entity-mutation.service`
reaches `workspaceStoreService.get()` (electron-store-backed) to resolve a mod path and
`pluginRegistryService.list()` for dialects (Context). The batch service instead **receives** the
resolved editable-source path and the parser dialects as arguments, so the write logic has **no**
Electron edge.

The payoff is direct: write correctness becomes **testable in a CC session** against a scratch mirror of
a mod tree — no Electron binary, no service-graph construction, no full-corpus parse. This **narrows the
residual local-only concern to corpus scale and harness perf** (the ~560s full-corpus grounding run),
not the Electron runtime, and it **corrects the earlier gate-3 framing** that conflated "needs the
binary to construct the graph / run the full corpus" with "the write logic needs Electron." It does not.

## Regression gate (mandatory)

This boundary **supersedes the live write path** under the seven shipped editable entities (the six
HOI4 entity forms — character, plane, ideology, module, state, technology — plus the mod descriptor;
ADR 026's "seven-entity save baseline"). It replaces theirs, so it must be proven behavior-preserving
before it is relied on:

1. Every existing `entity-mutation` / `write-file` spec is **green and unchanged**; the seven shipped
   entities write **byte-identically** to before.
2. A single-file patch through the new batch service is **byte-identical** to the old service's output
   (the one-file batch is the ADR 019 special case).
3. The batch runs **in-session** — pure Node, scratch mirror, **no Electron binary** (decision 6). This
   is stated explicitly as a gate, not assumed.
4. **Cross-file batch atomicity:** an **induced phase-2 rename failure** rolls **all** files back to
   their originals from backups (the rollback is specced, not asserted).
5. **loc-lines** round-trips a real BOM'd `.yml` **losslessly** — key order, comments, blank lines, and
   the `KEY:VERSION` suffix survive a set/insert/delete-and-write.
6. **Insert** produces a **byte-identical** result to a hand-authored block.

Added by the 2026-09-02 amendment (ZMT-56), on the same standing:

7. A **created** loc file carries the exact BICE BOM + `l_english:` header bytes, and a loc insert in
   the same batch adds its first key as a valid `KEY:VERSION "value"` line.
8. A **created** `.txt` is parseable, and an AST insert in the same batch adds its first block.
9. A batch that creates a file and then fails **leaves no file** — unlinked, no orphan — whether the
   failure lands in phase 1 or phase 2.
10. A **mixed** batch (create a new file, edit an existing one) induced to fail **unlinks** the new
    file and **restores** the existing one to its original bytes. This is the branch the amendment
    introduces and it is specced, not asserted.
11. `create` + first-write on one new file commits as an ordered sequence rather than being rejected
    by `assertOneOperationPerFile`, and the resulting file is byte-correct.

## Consequences

**Positive**

- Unblocks the **entire editable TL surface**: add, edit, delete, delete-tree, move-entity, `@`-var
  inline-on-delete, and localisation write-back all compose as batch operations across the two
  strategies. None needs a bespoke write path.
- **ADR 019 is superseded** by a strict generalization (single-file → cross-file, single-format →
  strategy-pluggable, patch → patch/insert/delete), and **L-012 closes**.
- Write correctness leaves the **local-only debt**: it is in-session verifiable (decision 6). The local
  run is now only for **full-corpus grounding scale**, not for write validation.
- The cross-file batch is the **substrate for later transactional operations** (cascade delete,
  move-entity); its residual-window semantics (decision 3) are **inherited** by all of them, stated once
  here rather than re-derived per operation.

**Negative / accepted**

- **True multi-file ACID is impossible** on a filesystem the tool does not own. The batch's guarantee
  carries a **residual phase-2 window** (a rename failing after an earlier rename committed), recovered
  by backup-restore and minimized by front-loading all fallible work into phase 1. This is an accepted,
  documented limit — the honest ceiling of cross-file transactionality on a non-transactional substrate.
- **The seven shipped entities' write path is replaced.** That is the whole point, and it is why the
  regression gate above is mandatory rather than advisory — a byte-level divergence on any shipped
  entity is a regression, not a refactor.
- **Create-override is designed but not implemented.** A future vanilla-only editable target is the
  trigger; the PoC's BICE-owned plane technologies do not require it (decision 5), so shipping it now
  would be building against a consumer that does not yet exist.

**Deliberately out of scope, recorded so the omission does not read as oversight**

- Any change outside `docs/`. Reading the code and BICE to verify is expected; editing is not. The batch
  service, both strategies, and the temp-write/rename/rollback land in later tickets.
- The edit / add / delete **UI** — forms, context menus, toolbar. This ADR is the write **substrate**,
  not its surface.
- `resolveWriteTarget` / **save-target settings** (which file localisation and sprites are written to).
  A distinct later ticket: this ADR routes to the **editable owner** (decision 5), not to a user's
  save-target preference.

## Alternatives considered

- **One serializer, not pluggable strategies.** Rejected — localisation `.yml` is not Clausewitz script
  (BOM'd, line-oriented `KEY:VERSION "value"`, not read by the parser). A single serializer either
  cannot write loc at all or grows a format switch inside itself; the strategy boundary is where that
  switch belongs (decision 1, 2).
- **A third strategy for `.gui`.** Rejected — `.gui`/`.gfx` are Clausewitz-family: same grammar, same
  offset-splice write mechanism as `.txt`. A separate strategy would duplicate the AST strategy for a
  format it already serves (decision 2).
- **Staging-directory atomic swap** for the cross-file commit. Rejected — an atomic directory swap is
  filesystem- and mount-dependent and unreliable in an arbitrary user mod directory the tool does not
  own (decision 3).
- **Journal / write-ahead log** for the cross-file commit. Rejected as overkill for user-initiated
  desktop edits: the failure to survive is a mid-batch rename error, which backup-restore over a
  renames-only phase 2 handles proportionally; a WAL answers a durability problem this boundary does not
  have (decision 3).
- **Error on edit-of-vanilla** instead of create-override. Rejected — it leaves a visible tree node
  uneditable with no path; create-override is the modding convention and the designed route (decision 5).
- **Keep ADR 019's per-file atomicity and issue N single-file writes for a cross-file operation.**
  Rejected — this is the exact partial-write hazard ADR 019 removed _within_ a file, reintroduced
  _across_ files: a failed write mid-sequence leaves some files updated and others not, with no rollback.
  Per-batch atomicity (decision 3) is the cross-file analogue of the decision ADR 019 already made
  per-file.
