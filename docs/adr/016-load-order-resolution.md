# ADR 016 — Load-order file resolution and provenance

- **Status**: Accepted
- **Date**: 2026-06-09

## Context

A workspace holds several sources at once — vanilla game files (read-only, lowest precedence) and one or more included mods — arranged in a load order. When more than one source provides a file at the same relative path, the game loads exactly one of them, and a mod may declare that it replaces an entire vanilla folder. To edit a mod meaningfully, the tool must answer, for every relative path across all sources: which source actually provides the file the game would load, and which sources it shadows.

This decision specifies that resolution at the **file** level: which file wins, from which source, honoring folder-level replacement. It does **not** merge the *contents* of contested files — computing the effective value of an entity defined in vanilla and overridden inside a mod's same-named file is a separate, harder problem (it requires entity-level parsing and per-key override rules) and is deferred. The output here is file provenance, not merged content.

## Decision

### Inputs — a pure function over enumerated data

Resolution is a pure function. It performs no filesystem access and parses no descriptors itself; the caller supplies fully-enumerated data:

- An **ordered** list of sources, lowest precedence first. Array order is load-order; vanilla is always first (lowest precedence). Later entries have higher precedence.
- Per source: its root, its `replace_path` folder list (already parsed from the descriptor by the caller), and its enumerated relative file paths.

Keeping the resolver free of I/O makes it testable with plain fixtures and independent of how sources are enumerated or how descriptors are parsed — the same purity boundary the workspace projection uses.

### Precedence — last-wins

For a given relative path provided by multiple sources, the **highest-precedence** source (latest in the ordered list) wins; lower sources are shadowed. Vanilla, being first, is overridden by any mod that provides the same path.

### Folder replacement — `replace_path`

A source may declare `replace_path` on a folder. This follows Paradox semantics: when a source declares `replace_path` on a folder, **all contents of that folder from every lower-precedence source are discarded** — not merged. A file that existed in a lower source's copy of that folder and is not re-provided by the replacing (or any higher) source simply does not appear in the resolved set. Folder replacement is a total shadow of lower sources within that folder, not a file-by-file merge.

Replacement composes with last-wins rather than terminating resolution:

1. Walk sources from lowest to highest precedence.
2. When a source declares `replace_path` on a folder, discard all lower-precedence contributions within that folder; only this source and higher sources contribute to it.
3. Outside replaced folders, plain last-wins applies per relative path.
4. Multiple sources may declare `replace_path` on the same folder; among the survivors of replacement, the normal last-wins rule still selects the winner. `replace_path` is "discard everything below me in this folder," after which higher sources still override by precedence.

### Output — provenance per resolved file

For each file in the resolved set, the resolver returns:

```ts
interface ResolvedFile {
  relativePath: string;
  absolutePath: string;
  winningSource: Source;
  shadowedSources: readonly Source[];
  reason: 'sole-provider' | 'last-wins' | 'replace-path';
}
```

- `winningSource` — the source whose file the game would load.
- `shadowedSources` — lower-precedence sources that provided the same relative path and were overridden. Empty means uncontested.
- `reason` — why this file won: `sole-provider` (only one source had it), `last-wins` (won a precedence contest), or `replace-path` (present because its folder was replaced, shadowing lower sources regardless of per-file contest).

Carrying `shadowedSources` and `reason` lets any later provenance display (override counts, which-files-this-overrides, the replacement-vs-override distinction) read the resolver's single output rather than re-resolving.

### Scope of this decision

This specifies and ships the resolver as a pure, tested function. No running consumer is wired to it yet — provenance display and any read-path that picks a winning source are separate work. The resolver is exercised by tests over the precedence and replacement cases; its output contract is the surface those later consumers build on. Effective-value (intra-file content merge) is deferred. Effective-value resolution spans two axes, both deferred to the same later unified work: the load-order axis — a value defined in a lower source and overridden in a higher one across sources — and the archetype-inheritance axis — a value on a base archetype overridden on a regular entity. This decision's resolver produces file provenance only and resolves neither axis.

## Consequences

**Positive**

- The resolver is a pure function of enumerated data — testable with fixtures, no filesystem or descriptor-parsing coupling.
- Provenance carries both *what* won and *why*, so display consumers need no second resolution pass.
- Folder replacement and last-wins compose in one walk; the two override mechanisms are expressed together rather than as special cases bolted on.
- The output contract is fixed before any consumer exists, so display and read-path work build on a stable surface.

**Negative / accepted**

- Shipping a resolver no running code calls yet — it is exercised only by tests this iteration. Accepted: wiring a consumer would pull in the deferred display/read-path decisions, and the resolver is the constraining design that those depend on.
- File-level only: a contested file resolves to one whole winner, not a merged value. Effective-value resolution is a later, separate decision.
- Enumeration cost is the caller's concern; resolving large folder trees (notably an entire vanilla game folder) may be expensive, but that optimization (loading only what an enabled feature needs) is deferred and out of this decision.

## Alternatives considered

- **Resolver enumerates files and parses descriptors itself.** Rejected — couples resolution to the filesystem and the descriptor parser, and makes it require fs/parse mocking to test. Pure-function-over-data keeps it a unit.
- **Return only the winning source per file (drop shadowed/reason).** Rejected — the display arc would re-resolve to show overrides, duplicating work the resolver already did in one pass.
- **Treat `replace_path` as terminal (a replaced folder ends resolution for that folder).** Rejected — incorrect: higher sources still override within a replaced folder by last-wins; replacement only discards *lower* sources.
- **Merge file contents (effective value) now.** Rejected for this iteration — requires entity-level parsing and per-key override semantics; far larger, and not needed to answer file provenance. Deferred.
- **A separate explicit load-order field instead of array order.** Rejected — array order already is load-order (consistent with how sources are ordered for display); a parallel order field is duplicate state. Reordering UI is deferred and does not require a separate field now.
