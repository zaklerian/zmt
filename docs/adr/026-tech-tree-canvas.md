# ADR 026 — Tech-tree canvas

- **Status**: Accepted
- **Date**: 2026-08-11

_The tech-tree (TL) canvas is what fills the placeholder region ZMT-41 left under an active feature.
It is the first component to consume the entire read/asset stack at once — `index:list('technology')`
(ADR 024), `techTreeGeometry:read` (ADR 025), and `asset:image` (ZMT-40) — and the first renderer
surface to hold cross-view shared state. Both firsts shape the decisions. This records the rendering
library (react-flow, with its headline feature deliberately unused), the state model (closing L-005
by YAGNI — no state-management or data-fetching library), the node/edge model, and the read-only-first
boundary. It is additive to ADR 021, 022, 024, and 025 and amends none of them; editing is blocked on
the write boundary, which does not yet exist._

## Context

The TL entry point exists. ZMT-41 landed the `aircraft` feature, the nav-mode toggle, and an
`activeFeatureId` in `AppShell` that resolves to a placeholder region (`FeatureTreePlaceholder`).
The active-feature value is a single `useState` in the shell — there is deliberately no feature-registry
abstraction and no shared-state machinery yet (the project map records this, and L-005 was deferred to
this ADR).

The read/asset stack the canvas draws on is complete and verified in the tree today:

- **`index:list('technology')`** (ADR 024) returns slim rows. Each row's `slim` is a `TechnologySlim`
  (`libs/contracts/src/technology/technology-slim.model.ts`): `id` (the resolution token = node id),
  `position` (`{ x, y }` in grid cells, `null` when the entity declares no own position), `pathTargets`
  (drawn OR-edges, from each `path` block's `leads_to_tech`), `dependencyTargets` (undrawn AND-edges,
  from `dependencies`), `nodeKind`, `categories`, and `startYear`. Provenance rides the `IndexSlimRow`
  wrapper and the companion `SourcesTable`, not the slim itself.
- **`techTreeGeometry:read`** (ADR 025) returns a folder-keyed `TechTreeGeometry`: per folder, a **list**
  of gridboxes (each `origin` / `step` / `axis` / `area`), the tech-area `area`, the `background` sprite
  reference, and the `yearAxis` labels — plus the winning `.gui`'s provenance. The folder is keyed by the
  `.gui` `containerWindowType` name, which a technology's `folder.name` matches verbatim.
- **`asset:image(spriteName)`** (ZMT-40) returns an `AssetImageResult` — `ok` with a PNG `data:` URL,
  or one of two clean negatives (`unresolved`, `unsupported`). Neither negative is a thrown error.

The canvas is the placeholder's replacement, and it is **two firsts** — the first full-stack integration
of that entire read/asset stack, and the first cross-view shared state in the renderer. Both firsts are
why the rendering-library and state decisions below are recorded rather than left to implementation.

## Decision

### 1. Rendering: react-flow, with its layout engine deliberately unused

The canvas uses **react-flow** (`@xyflow/react`). The honest build-vs-buy is recorded here, because the
headline reason to adopt react-flow does **not** apply:

- **Not bought — auto-layout.** Node positions are **authored**, derived from the technology's grid-cell
  `position` composed with the folder geometry (decision 3). react-flow's layout engine — its main selling
  point — is therefore disabled and moot. Virtualization is moot for the same "we already know where every
  node goes" reason and because the folders are small (the largest single folder is on the order of ~139
  nodes; this is a BICE-derived figure, cited to justify skipping virtualization, not a hard bound to
  encode).
- **Bought — the viewport, the selection model, and edge rendering/routing.** Pan / zoom / fit, the
  controlled selection model, and — the part most tedious to hand-roll — edge drawing and routing. The tree
  needs game-style wide connector lines and two visually distinct edge kinds (decision 3); the edge layer is
  the real purchase.
- **Cost.** A new renderer dependency and its controlled node/edge model in the renderer layer, which this
  project keeps deliberately lean. The dependency pins to an exact version per R-CODE-3.

**Reversal condition (recorded as an explicit trigger to revisit).** If react-flow's controlled model fights
the authored-position + custom-node approach, or its edge customization cannot achieve the required connector
styling, fall back to **hand-rolled SVG** — authored positions make placement trivial, and only edge-drawing
is non-trivial, so the fallback loses only the part react-flow was actually bought for. This is a live reversal
condition, not a rhetorical one.

### 2. State: L-005 closed — no state-management library, no data-fetching library

**L-005** (optimistic updates / state management, deferred three times since 2026-06-08) is **closed by
YAGNI**. The canvas is the first save/render flow that would exercise a store, and it does not need one.

- **Server state is fetch-once-hold.** The main process is already the cache — the index (ADR 024, cached
  per entity type with mtime validation), geometry (ADR 025, mtime cache), and images (ZMT-40, resolved-path
  + mtime cache) are all cached main-side. The renderer fetches and holds; it does **not** need a
  data-fetching/caching library (no React Query / SWR). A second cache in the renderer would duplicate the
  authoritative one behind IPC.
- **UI state is React primitives.** Selection — and later filter / country / highlight — is held in a React
  context + `useReducer` (A-REACT-3: multiple pieces transitioning together, auditable in one place). No
  Zustand / Jotai / Redux.
- **Revisit trigger.** Only if the cross-view state genuinely tangles — multiple views mutating shared state
  with synchronization problems. One canvas reading fetched data and holding a selection is not that.

This is consistent with the project's YAGNI baseline (the seven-entity save baseline, L-005's original
framing) and its standing discipline against renderer abstraction. Adopting a store pre-emptively is the
**rejected alternative** (see Alternatives) — a store bought against one consumer over-fits that consumer and
ossifies before a second view exists to shape it.

### 3. Node and edge model

- **Three node kinds**, from the slim row's `nodeKind` — derived by signal, not a lookup table:
  `wide` (the entity declares `enable_equipments`), `simple`, and `sub` (a `sub_technologies` member, which
  carries no own `position`). Each is a custom react-flow node component.
- **Node placement.** A `simple`/`wide` node's pixel position is the folder geometry's gridbox
  `origin + cell × step`, with axis growth direction from the gridbox `format`/`axis` (ADR 025). The node's
  grid cell comes from the slim row's `position` — placement uses **`position`, not `start_year`**. `start_year`,
  `position.y`, and the gutter year are **three distinct quantities** (ADR 025); the canvas must not conflate
  them. `position.y` is a layout row; `start_year` is the in-game research year; the gutter year is what the
  `.gui` prints at a row.
- **Which gridbox — grounded, not assumed.** A folder carries a **list** of gridboxes at **different**
  origins, not a single shared origin (`TechTreeGridbox[]`; the shipped geometry model records that BICE's
  `air_techs_folder` declares four gridboxes at four origins, correcting ADR 025's original "gridboxes share
  an origin" reading). So `origin + cell × step` is under-specified until the node→gridbox binding is fixed:
  which gridbox's origin a given technology's cell is measured from is **read from BICE at implementation**,
  not asserted here (ledger `L-022`), consistent with the read-shapes-don't-recall discipline ADR 022/024/025
  each paid for.
- **`sub` nodes** (no `position`) render **adjacent to their parent** — a react-flow child/relative node — not
  at absolute coordinates. The engine attaches a sub-technology to its parent; the canvas mirrors that
  relationship rather than inventing a coordinate the data does not carry (R-CODE-5).
- **Two edge kinds.** `path` (from `pathTargets`) draws as the solid game-style connector; `dependencies`
  (from `dependencyTargets`) draws as a distinct dashed overlay, **off by default and toggleable**. The two
  lists are already distinct on the slim row; the canvas keeps them visually distinct.
- **Icons** via `asset:image(spriteName)`. A node whose image resolves `unresolved` or `unsupported` shows a
  **fallback, never a crash** — the two negatives are data outcomes the model already carries, not errors
  (ZMT-40).

### 4. Read-only first; editing follows the write boundary

The canvas **renders and selects; it does not mutate.** Selection is supported because it is the precondition
for later editing, but there is no add / edit / delete — those need the **write boundary**, which does not yet
exist (ADR 019 is the single write path for entity scalar deltas; adding, moving, and geometry writes are
tracked but unbuilt — ledger `L-011`, `L-012`, `L-015`). The canvas is the **full-stack integration test** for
the read/asset stack; editing is layered on after the write boundary lands.

The read-only canvas is shaped so interactivity is an **addition, not a rebuild**: selection state and the
node/edge model are the same surfaces a future editor writes through. This is the same read-before-write split
every entity slice in this project has taken (ADR 024 decision 1; ADR 025 decision 4).

### 5. Icon sprite-name convention is a grounding step, not an assumption

The technology-token → icon-sprite-name convention (e.g. whether a token maps to `GFX_<token>_medium`) is
**read from BICE at implementation, not assumed here.** ZMT-39 deliberately left this to the icon consumer,
and the canvas is that consumer. It is recorded as an implementation grounding step with a named resolution
(ledger `L-022`, shared with the node→gridbox binding of decision 3 as the pair of BICE-grounded canvas
questions), consistent with the on-disk-shape-is-read lesson ADR 022/023/024/025 each turned on. This is not a
decision; it is the deliberate deferral of a data-shape question to the point where BICE can answer it.

## Consequences

**Positive**

- The canvas exercises the **entire read/asset stack at once**. A subtle defect anywhere — geometry, sprite
  resolution, DDS decode, the index, or edge modeling — surfaces here, before the write boundary is built on
  top. It is the integration test that the four prior read/asset ADRs (021-derived thin projection, 022
  symbols, 024 index, 025 geometry) actually compose.
- **L-005 closes.** The renderer stays library-light: no state-management library, no data-fetching library,
  server state fetch-once-held against the main-side cache, UI state in React primitives.
- Country switching and category / search filtering (later tickets) are **renderer-side filters over the
  workspace-scoped fetched set** — the canvas renders one folder / country at a time, so those are views over
  data already in hand, not new reads.

**Negative / accepted**

- **react-flow is a new renderer dependency** in a deliberately lean layer, adopted for the third of its three
  headline features (edges) with the other two (layout, virtualization) moot. The cost is carried against a
  live reversal condition (decision 1), not silently.
- Two canvas questions are **deferred to BICE-grounding at implementation** rather than answered here: the
  node→gridbox binding (decision 3) and the icon sprite-name convention (decision 5), both under ledger
  `L-022`. The read model carries the cost of naming what it does not yet know rather than guessing.
- **Editing is blocked on the write boundary.** The read-only canvas carries the cost of being shaped for an
  editor that does not exist yet — selection is built now solely because retrofitting it later would be a
  reshape, not an addition.

**Deliberately out of scope, recorded so the omission does not read as oversight**

- Any change outside `docs/`. Reading code and BICE to verify is expected; editing is not. The canvas
  component, its custom nodes, the react-flow adoption, and the context/reducer all land in later tickets.
- The **write boundary**, editing, context menus, the toolbar, country switch, and filters — all later.
- The **upgrades view**.

## Alternatives considered

- **Hand-roll SVG from the start.** Rejected for the first cut — the authored positions make node placement
  trivial, but edge drawing (game-style wide connectors, two distinct kinds, routing) is the tedious part, and
  react-flow buys exactly that. Recorded not as a dead end but as the **named reversal path** (decision 1): if
  react-flow's controlled model fights authored positions or cannot style the connectors, the fallback loses
  only the part that was bought.
- **Adopt a state-management library (Zustand / Jotai / Redux) or a data-fetching library (React Query / SWR)
  pre-emptively.** Rejected — server state is fetch-once-held against an authoritative main-side cache, and one
  canvas holding a selection is not the multi-view synchronization problem a store exists to solve. A store
  bought against a single consumer over-fits it and ossifies before the second view exists to shape it; this is
  the same one-consumer-over-fit argument ADR 024 decision 6 makes for the index registry. L-005's revisit
  trigger is recorded in decision 2.
- **Place nodes from `start_year` instead of `position`.** Rejected — `start_year`, `position.y`, and the
  gutter year are three distinct quantities (ADR 025); `position` is the layout coordinate and `start_year` is
  a research year. Conflating them is the exact defect ADR 025 was written to prevent.
- **Assume the node→gridbox binding or the icon sprite-name convention in this ADR.** Rejected — a folder
  carries multiple gridboxes at different origins, and the token→sprite convention was left to the icon
  consumer by ZMT-39. Both are on-disk shapes read at implementation, not recalled (ledger `L-022`), the same
  discipline ADR 025 applied to the year-symbol convention (L-021).
- **Build editing into the first cut.** Rejected — add / move / geometry edits are writes, and the write
  boundary does not exist (ADR 019 covers scalar deltas only; L-011 / L-012 / L-015 track the rest). Read and
  render first, edit when the write boundary lands, is the split every slice has taken (decision 4).
