# ADR 029 — Write-target resolution

- **Status**: Accepted
- **Date**: 2026-08-27

_Every content-creating write in the tool picks its own destination file, and the user has no say
in any of them. This ADR records the resolution model that ends that: a small closed set of
write-kinds, one `resolveWriteTarget` consult point, and a per-mod preference that overrides a
default. Written before the wiring so the several existing write paths route through one contract
rather than each keeping its own. **Three of the ticket's premises did not survive verification and
are corrected here rather than recorded as written**: (a) there is no hardcoded default anywhere —
every current default is COMPUTED at its call site from workspace data, and the technology Add path
has TWO different ones; (b) `resolveWriteTarget(kind)` cannot be a pure function of the kind,
because the call-site fallback it must degrade to differs per call site; (c) a new target file
cannot be "created empty on first write" — both format strategies throw on an empty or absent file
(`write-batch.service.ts:166-181`, `ast-scoped-delta.strategy.ts:146-147`), so a created target
must be SEEDED with its format's minimal valid preamble, and creating it is a batch operation with
an unlink rollback, which is a named amendment ADR 027 decision 3 needs. It is additive to ADR 013,
024, 027, and 028, and amends none of them; the one amendment it REQUIRES of ADR 027 is stated as
decision 6 and lands with the implementation._

## Context

Three content-creating write paths exist or are planned, and each resolves its own destination:

- **A localisation key insert.** `lookupLocalisation` walks the workspace's sources in precedence
  order and returns `defaultTarget` — computed by `writeTargetOf`
  (`apps/electron/src/main/localisation/localisation-lookup.service.ts:87-97`) as the **first loc
  file by path** of the **last editable source** that owns one, where "by path" is the sort
  `enumerateLocFiles` applies and the language filter is the `_l_english.yml` filename suffix
  (`DEFAULT_LOC_LANGUAGE`, `localisation-lookup.service.ts:18`). It crosses the wire as
  `LocalisationLookupResult.defaultTarget` (`libs/contracts/src/localisation/localisation-read.model.ts:24-32`,
  already commented as the ADR 028 decision 6 seam) and is consumed by both the edit path
  (`computeTechnologyLocPlan`, `libs/r-game-hoi4/src/technology/technology-loc-delta.util.ts:73-82`)
  and the add path (`buildTechnologyAddOperations`, `technology-add.util.ts:64-79`). Both **drop the
  loc half of the write** when it is null rather than guess.
- **A technology block insert (ZMT-51).** The Add path resolves **two different targets**, not one
  (`apps/zmt/src/features/tech-tree-canvas/hooks/use-technology-add.hook.ts`): add-as-child writes
  into the **invoking technology's own file**, read from that row's provenance (`targetOf`, `:306-315`);
  free placement writes into the **editable file that owns the most of this folder's technologies**,
  ties broken on the lower path (`defaultTargetOf`, `:211-239`). Both return null for an
  all-vanilla folder, which refuses the add (`status = 'readonly'`).
- **A sprite declaration insert.** No write path exists. Sprites are read from `interface/*.gfx`
  (`SPRITE_DIR` / `SPRITE_FILE_EXTENSION`, `libs/e-game-hoi4/src/sprite/sprite-location.const.ts`);
  creating one is a later ticket with, today, no target at all.

**The ticket's "hardcoded default" is the one thing none of these is.** Every default above is
derived from workspace data at the moment of the write — which is _better_ than a hardcoded path
and does not change the problem, because none of them is **the user's choice** and none **persists**.
That is what this ADR fixes. It also means decision 5's fallback is "today's computed default",
named per kind, not one constant to point at.

Three further facts from the code shape the decisions:

- **The preferences surface is app-global and its key set is closed.** `Preferences`
  (`libs/contracts/src/preferences/preferences.model.ts`) is a four-key interface —
  `hideUnsupportedFiles`, `hideVanilla`, `locale`, `pluginSettings` — with `PREFERENCE_KEYS` and
  `isPreferenceKey` gating the IPC handlers (`preferences-handlers.setup.ts`), backed by one
  `electron-store` file per app (`preferences-store.service.ts`, `resolveStoreName()` → `preferences`
  / `preferences.dev`). There is no per-project store and **no "project" concept**: the workspace is a
  single `{ includedMods }` record persisted under the `workspace` key in that **same store file**
  (`workspace-store.service.ts`). Per-mod scoping is therefore a **keyed value inside a global key** —
  which the store already does once, in `pluginSettings` (`Record<pluginId, …>`).
- **A mod's identity is a `randomUUID()` minted when it is added** (`workspace-store.service.ts:26`).
  It survives launches (`parseWorkspace` preserves it) but **not** a remove-and-re-add, and
  `pruneMissing` drops a mod whose path has vanished.
- **Neither strategy can write a file that is not already there and valid.** The batch reads every
  target first and turns `ENOENT` into `NOT_FOUND` (`readSource`, `write-batch.service.ts:166-181`);
  the AST insert throws `NOT_FOUND` when the parent block it inserts under is absent
  (`ast-scoped-delta.strategy.ts:146-147`), and the technology insert names `technologies` as that
  parent (`TECHNOLOGY_PARENT_BLOCK`, `technology-add.util.ts:14`); the loc insert **appends** a key
  line and synthesizes **no** header and **no** BOM (`applyInsert`, `loc-lines.strategy.ts:136-166`,
  `BOM` held as a document flag at `:46`). An empty new file fails all three.

## Decision

### 1. Write-target is resolved per write-kind, from a small closed set (Q100)

The resolution unit is the **write-kind**. Three kinds, and the set is closed:

| Kind         | Folder                               | Files             |
| ------------ | ------------------------------------ | ----------------- |
| `locKey`     | `localisation/`, `_l_<language>.yml` | loc `.yml`        |
| `technology` | `common/technologies/`               | Clausewitz `.txt` |
| `sprite`     | `interface/`                         | `.gfx`            |

Each kind resolves **independently**. A loc key and a technology block **cannot** share a file:
different formats, different trees, different strategies (ADR 027 decision 2). `sprite` is named
now — reserved, with no consult point until sprite-creation lands — so the model is complete rather
than grown one kind at a time.

The folder for a **script** kind is already declared once, in the entity registry
(`ENTITY_REGISTRY[kind].folder`, plus `extension` where it is not `.txt` —
`libs/e-game-hoi4/src/entity-registry/entity-registry.const.ts`, ADR 024 decision 2). The kind→folder
mapping reuses that entry and does not restate it. **`locKey` is the exception and is recorded as
one**: localisation is not an indexed entity type, so its folder and language-suffix rule live
main-side in `enumerate-loc-files.util.ts` instead. Two sources of "where does this kind live",
because that is what the code has; unifying them is not this ADR's job.

**Rejected: one global "active file" for everything** (Q100 A2) — structurally impossible across
formats; a single active file cannot be simultaneously a BOM'd loc `.yml` and a Clausewitz `.txt`.
**Rejected for now: per-kind AND per-folder** (Q100 A3) — more than a baseline needs. It is the
natural extension when a mod's localisation is folder-split (`localisation/english/` vs
`localisation/replace/english/`), and it is ledgered (`L-029`), not built.

### 2. `resolveWriteTarget` is the single consult point — for creating writes only

Every write that **creates content no file yet owns** resolves its destination through
`resolveWriteTarget`, replacing the call-site default it carries today. This is the one place
"which file does new content go to" is decided: the add-technology path, the loc-key insert inside
the edit-loc path, and future sprite/geometry-create paths all consult it.

**The scope line is creation, not the write path.** A write that targets a file which **already owns**
the content — a loc `set` on an existing editable key, a patch on an existing entity block — is
routed by **provenance to the owning file** (ADR 027 decision 5) and never consults
`resolveWriteTarget`. This is exactly the split the loc code already makes
(`technology-loc-delta.util.ts`: existing editable key → `set` on `entry.target`; otherwise →
`insert` into `defaultTarget`), stated as the rule so it is not re-derived per kind.

**The signature takes the call site's fallback, because the ticket's `resolveWriteTarget(kind)` is
not implementable.** Today's defaults are computed per call site and differ _within one kind_: the
technology Add path's add-as-child inherits the parent's file while free placement takes the
folder-plurality file (Context). A kind-only signature would have to pick one and silently change
the other's behavior. So:

```
resolveWriteTarget(kind, fallback) → target | null
```

with one rule, in order: **the stored preference for (mod, kind) when it is set and still resolves;
otherwise the `fallback` the call site computed; otherwise null.** Null keeps today's meaning at every
call site — refuse the add, drop the loc half — and never invents a file.

`fallback` also carries **which mod** the write resolved to, and that is the mod the preference is
looked up under (decision 4). **The preference chooses the FILE within that mod; it never moves a
write to a different mod.** Which mod a write lands in is provenance/owner-routing (ADR 027
decision 5) and stays out of scope, exactly as the ticket frames it — an edit-of-vanilla override
still writes into the active mod, and only the file inside it is this ADR's concern.

### 3. A target is an existing file or a new, seeded one (Q101)

For each kind the user picks **an existing file in that kind's folder** or **names a new file**. The
choice is made in a **settings surface** — toolbar-homed, alongside the existing canvas toolbar
(`canvas-toolbar.component.tsx`) and the app settings modal (`app-settings-modal.component.tsx`); which
of the two hosts it is the implementation ticket's call — and is **not prompted at write time**.
Write-time prompting interrupts the edit flow the tool deliberately keeps clean, and would fire on
every add.

**A new target is created SEEDED, not empty.** "Empty on first write" does not survive the code
(Context): an empty file fails the batch's read, the AST insert's parent lookup, and produces a
headerless loc file the engine will not read. The seed is the format's minimal valid preamble:

- `locKey` → UTF-8 BOM + the `l_<language>:` header line, in the language the target's filename
  suffix declares. `applyInsert` appends beneath what is already there and synthesizes neither.
- `technology` → the `technologies = { }` wrapper, because the insert addresses that **parent block**
  and not a file position (ADR 027 decision 4).
- `sprite` → the `spriteTypes = { }` wrapper, on the same rule, when the kind gains a consult point.

The seed is **per kind**, and it is the second thing a kind registers after its folder.

### 4. Preference-backed, scoped by mod (Q102)

Targets persist through the **existing preferences surface** — `preferencesService` over
`preferences:get` / `set` / `getAll` — as **one new `Preferences` key** whose value is scoped by mod:

```
writeTargets: Record<ModId, Partial<Record<WriteKind, RelativePath>>>
```

This is the shape `pluginSettings` already has (a keyed record inside one global key), which is why
it needs no new store, no new IPC channel, and no change to the `PreferenceKey` guard beyond adding
the key to `Preferences` and `PREFERENCE_KEYS`. The mod is the **outer key**, so the stored value is a
**mod-relative path only** — never an absolute path from the renderer, and never a second `modId` that
could disagree with the one the write already resolved to (decision 2). Together the two halves
reconstruct the `{ modId, relativePath }` every write in the app is addressed by.

**Not global**: a file target names a file inside one mod, and the workspace admits several editable
mods at once (`parseWorkspace` marks every included mod `editable`); one flat target per kind would
force new content of that kind into one mod regardless of which mod the write resolved to. **Not
per-session**: the whole requirement is that the choice sticks. The scope word is **mod**, not
"project" — the codebase has no project concept, and the workspace is a single record, so per-mod is
both the finest scope that means anything and the scope the write's own `modId` already supplies.

**Accepted cost, stated because it is a real defect and not a hypothetical**: `ModId` is a
`randomUUID()` minted at add-mod time (Context), so removing a mod and re-adding it **orphans** its
stored targets. Decision 5 is what makes that harmless — an unresolvable preference degrades to the
default rather than erroring — and re-keying on a stable mod identity is ledgered (`L-030`), not
solved here.

### 5. Unset — or unresolvable — falls back to today's default

Until a user sets a target for a kind, `resolveWriteTarget` returns the `fallback` the call site
computed, which is **exactly today's behavior**, per kind and per call site:

- `locKey` → `LocalisationLookupResult.defaultTarget` — the first loc file by path of the last
  editable source (`writeTargetOf`, `localisation-lookup.service.ts:87-97`).
- `technology`, add-as-child → the invoking technology's own file (`targetOf`,
  `use-technology-add.hook.ts:306-315`).
- `technology`, free placement → the editable file owning the most of the folder's technologies
  (`defaultTargetOf`, `use-technology-add.hook.ts:211-239`).
- `sprite` → none; the kind has no consult point until sprite-creation lands.

**A stored target that no longer resolves falls back the same way** — the mod left the workspace, the
file was deleted or renamed outside the tool, the source turned readonly. It **never errors and never
creates the missing file**: a preference is a preference, and a stale one must not block a write or
resurrect a file the user deleted.

The tool therefore works before configuration, and every path behaves **byte-identically to today**
until a preference is set. This makes the implementation ticket a strict improvement over the current
behavior rather than a gate in front of writing.

### 6. Creating the target file is a batch operation, and it amends ADR 027 decision 3

Creating a new target is **not** a separate step before the batch. It is an operation **inside** the
same all-or-nothing batch that writes the content, because the alternative — create the file, then
run the batch — leaves a stray file behind on every batch that fails, and the failure modes that
matter (path-guard, readonly source, byte ceiling) are exactly the ones phase 1 already catches.

This requires **one amendment to ADR 027 decision 3**, named here and landed by the implementation
ticket: an operation may declare its target **create-if-absent with a seed** (decision 3), and the
rollback for a file the batch **created** is **unlink**, not backup-restore — there is no original to
restore. Phase 1 stages the seeded-then-patched bytes exactly as it stages any other target; phase 2
renames; a phase-2 failure unlinks the created files and restores the pre-existing ones. The batch's
guarantee and its residual window (ADR 027 decision 3) are otherwise unchanged.

## Consequences

**Positive**

- **The deferred save-target seams close.** ADR 028 decision 6 (the loc file target) and ZMT-51 (the
  tech-insert target) stop being call-site decisions and route through `resolveWriteTarget`. The
  seam comments already planted in `localisation-read.model.ts`, `entity-form.model.ts`,
  `technology-loc-delta.util.ts`, and `loc-lines.strategy.ts` get the symbol they name.
- **Adding a creatable kind is adding a kind, not a mechanism.** A new kind registers a folder (from
  the entity registry), a seed, and a fallback; it inherits the preference, the settings surface, the
  staleness handling, and the create-if-absent path.
- **The write itself is unchanged.** `resolveWriteTarget` decides the file; the ADR 027 batch still
  commits atomically to whatever files it is given. The only change to the write boundary is
  decision 6's create-if-absent, and it is additive.
- **Sprite-create and geometry-create inherit the model** by registering a kind, rather than each
  inventing a target rule as ZMT-51 had to.

**Negative / accepted**

- **`resolveWriteTarget(kind)` is not the signature.** The fallback must be passed in, because the
  call site's default is not a function of the kind (Context, decision 2). The consult point stays
  single; it is not parameterless, and a reader expecting the ticket's shape will find one extra
  argument.
- **Per-mod targets orphan on remove-and-re-add**, because a mod's id is a random UUID (decision 4).
  Mitigated to a silent fallback by decision 5; re-keying is `L-030`.
- **ADR 027 decision 3 needs an amendment** for create-if-absent and its unlink rollback (decision 6).
  This ADR does not amend it in place — the amendment lands with the implementation, against real
  strategy code, rather than as prose written ahead of it.
- **Two sources of "where does this kind live"** — the entity registry for script kinds, main-side
  constants for loc (decision 1). Recorded rather than unified; unifying them is a read-layer change
  with no write-target payoff.
- **Per-folder targets remain unbuilt** (`L-029`). A mod whose localisation is folder-split gets one
  target for all of it.

**Deliberately out of scope, recorded so the omission does not read as oversight**

- Any change outside `docs/`. Reading the code to verify is expected; editing is not.
- The **settings-surface UI**, the **file picker**, the **new-file naming input**, and the
  **persistence wiring** — the implementation ticket.
- `resolveWriteTarget`'s interaction with **provenance-routed create-override** (ADR 027 decision 5,
  deferred). An edit of a vanilla-owned entity still writes into the active mod; **which file inside
  that mod** is this ADR's concern, and it is orthogonal to owner-routing.
- **Country switch, hover card, `@`-var editor, upgrades view** — each its own ticket.

## Alternatives considered

- **One global "active file" for all new content** (Q100 A2). Rejected — structurally impossible: the
  kinds write different formats into different trees through different strategies (ADR 027 decision 2).
- **Per-kind AND per-folder targets** (Q100 A3). Rejected for now — beyond a baseline; the natural
  extension once a mod's localisation is folder-split, ledgered as `L-029` (decision 1).
- **Prompt for the target at write time.** Rejected — it interrupts the edit flow on every add, and
  turns a two-click add into a file dialog. The choice is stable per mod, which is what makes it a
  preference (decision 3).
- **Keep `resolveWriteTarget(kind)` and pick one default per kind.** Rejected — the technology kind
  has two live call-site defaults with different meanings (inherit the parent's file vs the folder's
  plurality file). Collapsing them to one silently changes add-as-child's behavior, which no part of
  this ticket asked for (decision 2).
- **A global (non-mod-scoped) write-target preference.** Rejected — the workspace admits several
  editable mods, so one flat target per kind would force new content into whichever mod was open when
  the preference was set, overriding the mod the write itself resolved to (decision 4).
- **A new per-project store file** instead of a keyed value in the existing store. Rejected — the
  codebase has no project concept and the workspace itself lives in the shared store; a second store
  buys nothing and doubles the migration surface (decision 4).
- **Create the new target file empty** (the ticket's wording). Rejected — it fails the batch's read,
  the AST insert's parent lookup, and produces a headerless loc file the engine will not read
  (Context). Seeded creation is the same decision made against what the strategies actually accept
  (decision 3).
- **Create the target outside the batch, before it.** Rejected — every failed batch then leaves a
  stray empty file, and the file's own creation escapes the path-guard and rollback the batch already
  provides (decision 6).
- **Hardcode a better default and skip the preference.** Rejected — it re-answers a question the user
  asked to own, and the current defaults are already the best a heuristic can do from workspace data
  (Context). The gap is choice and persistence, not a smarter guess.
