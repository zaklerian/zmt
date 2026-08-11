# ZMT-43 — Node→gridbox binding — Step 1 grounding report

- **Ticket**: ZMT-43 — Tech-tree canvas (skeleton): ground the node→gridbox binding, then render
- **Date**: 2026-08-11
- **ADR**: 026 (canvas), 025 (geometry). Closes the node→gridbox half of ledger `L-022`.
- **Corpus**: BICE at `/home/user/test-mod-bice` (`ZMT_GROUNDING_CORPUS`). Never vendored; never modified.
- **Files read**:
  - `interface/countrytechtreeview.gui` (the `air_techs_folder` container, lines 3799–4099)
  - `common/technologies/air_techs.txt` (the base plane tree, 44 tokens)
  - `common/technology_tags/00_technology.txt` (the `technology_folders` block, line 278+)

## Headline

**The binding is groundable — but by a rule that matches none of the three candidates the
prompt listed.** A technology's `folder` block names only the folder and a cell `position`; it
names **no gridbox**. The gridbox is resolved structurally:

> **Each of a folder's gridboxes is named `{seedTechId}_tree`, where `seedTechId` is a hidden
> "generic" root technology (`allow = { always = no }`). The `path`-edge graph partitions the
> folder's technologies into connected components, one per seed. Every technology binds to the
> gridbox of the seed in its component, and is placed at that gridbox's LOCAL
> `origin + cell × slotsize`.**

Two candidate models are **disproven** against the data:

- **Single shared origin** (ADR 025's original "gridboxes share an origin" reading, already
  corrected by ADR 026): impossible. `multi_role`(cell x=11) must render visually **left** of
  both `CAS`(x=6) and `naval_bomber`(x=9); under any single positive-step origin a larger cell is
  always further right. Single-origin also leaves the entire right third of the authored tech area
  (px 2160–3720, where BICE prints the `light_bomb`/`tac`/`strat` column subtitles) empty.
- **Cell-space partition** (a tech's x/y range selects the gridbox): impossible. The visual bands'
  cell ranges interleave — fighters x∈{−1..11}, CAS x∈{6..10}, bombers x∈{9..26}; e.g. cell 9
  (naval) < cell 10 (CAS) < cell 11 (multi-role) span three different gridboxes. No x threshold
  separates them.

This **does not contradict ADR 026** — decision 3 deliberately deferred the binding to
"read from BICE at implementation" (`L-022`) rather than asserting a candidate. It vindicates that
deferral. Per the standing acceptance criterion, the rule as found (differing from every listed
candidate) is implemented to what BICE shows and flagged here.

## Evidence

### The folder's gridboxes (`countrytechtreeview.gui:3800–4099`)

`air_techs_folder` declares four gridboxes, each `slotsize = { 70 70 }`, `format = "UP"`:

| Gridbox name (`countrytechtreeview.gui`)      | `origin`      | line |
| --------------------------------------------- | ------------- | ---- |
| `tech_air_engine_jet_tree`                    | `{ 190, 172 }` | 4071 |
| `generic_fighter_tree`                        | `{ 340, 32 }`  | 4078 |
| `generic_bomber_tree`                         | `{ 1075, 32 }` | 4085 |
| `generic_strategic_bomber_tree`               | `{ 1610, 32 }` | 4092 |

### The technologies reference no gridbox (`air_techs.txt`)

Every air tech's `folder` block carries `name = air_techs_folder` + a `position` in `@`-symbol
cells and **nothing else** (e.g. `early_fighter`, `air_techs.txt:184`). The x-symbols
(`air_techs.txt:30–45`) form one continuous axis: `@FTR_START=5 @FTR=3 @HV_FTR=-1 @INT=7 @MTR=11`
`@CAS_START=8 @CAS=6 @HV_CAS=10` `@BMB_START=18 @HVY_BMB=22 @LGT_BMB=14 @MED_BMB=18 @NAV_BMB=9`
`@TRANSPORT=26`; y-symbols are years (`@1933=2 @1936=4 @1940=6 @1944=8 @1946=12`).

`technology_folders` (`00_technology.txt:345`) declares `air_techs_folder = { ledger = air;
available = {…} }` — a `ledger` + availability trigger, **no** gridbox or sub-group mapping. The
gridbox tree-names appear **nowhere** in `common/` — only in the `.gui`.

### The gridbox name encodes a hidden seed technology

Exactly three air techs are hidden roots (`allow = { always = no }`): `generic_fighter`,
`generic_bomber`, `generic_strategic_bomber`. For each, `{id}_tree` **is** a gridbox name (3/3;
no non-seed tech name collides with a gridbox). The fourth gridbox
(`tech_air_engine_jet_tree`) has no seed tech in `air_techs.txt` → it binds no base-tree node
(the jet-engine tree is elsewhere; `jet_fighter1` belongs to the fighter component).

### `path`-edges partition the folder into one component per seed

The undirected `leads_to_tech` graph over `air_techs.txt` yields exactly three connected
components, each containing exactly one seed, covering all 35 positioned techs with zero
cross-file leakage (verified corpus-wide over all `common/technologies/*.txt`):

| Component (seed → gridbox)                              | size | example members                                     |
| ------------------------------------------------------- | ---- | --------------------------------------------------- |
| `generic_fighter` → `generic_fighter_tree` (o.x=340)    | 14   | fighter1-3, interceptor1-3, multi_role1-3, heavy_fighter2-3, jet_fighter1 |
| `generic_bomber` → `generic_bomber_tree` (o.x=1075)     | 7    | CAS1-3, twin_CAS2-3, early_CAS                       |
| `generic_strategic_bomber` → `generic_strategic_bomber_tree` (o.x=1610) | 14 | naval_bomber1-3, light_bomber1-3, tactical_bomber1-3, strategic_bomber2-3, transport_plane1 |

The 9 remaining `air_techs.txt` tokens are `cv_*` **sub-technologies** (no `position`,
`sub_technologies` members) — rendered adjacent to their parent, not on a gridbox.

Categories do **not** substitute for this: `tactical_bomber` spans two gridboxes
(`generic_bomber` vs `light_bomber`/`tactical_bomber`), and `transport_plane1` carries no role
category at all yet lands correctly via its component.

## Confirmation against real techs (Step 1 gate 2)

`pixel = boundGridbox.origin + cell × 70`. Landing checked against the folder's authored column
subtitles (`countrytechtreeview.gui:3982–4069`) and the year gutter (`:3840–3911`):

| Tech                | position (cell) | component → gridbox (origin)            | pixel        | authored anchor                    |
| ------------------- | --------------- | --------------------------------------- | ------------ | ---------------------------------- |
| `multi_role1`       | x=11, y=4       | fighter → `generic_fighter_tree` (340,32)   | **1110, 312** | `mr_fighter` subtitle x≈1160, 1936 row |
| `CAS1`              | x=6, y=4        | CAS → `generic_bomber_tree` (1075,32)       | **1495, 312** | `cas` subtitle x≈1685              |
| `naval_bomber1`     | x=9, y=4        | bomber → `generic_strategic_bomber_tree` (1610,32) | **2240, 312** | `nav` subtitle x≈2180        |
| `strategic_bomber2` | x=22, y=6       | bomber → `generic_strategic_bomber_tree` (1610,32) | **3150, 452** | `strat` subtitle x≈3095, 1940 row |

All land within a per-band constant offset of their authored subtitle; the year gutter matches
`gridbox.origin.y (32) + cell.y × 70` against the printed labels (1933→px172, 1936→px312, …).
`strategic_bomber2` and `naval_bomber1` sit in the **non-first** gridbox — the case single-origin
misplaces (single-origin puts `strategic_bomber2` near px 1730 instead of 3150).

`start_year`, `position.y`, and the gutter year stay three distinct quantities (ADR 025):
placement uses `position` only; `strategic_bomber2.start_year=1940` but its row is `position.y=6`.

## Consequences for Step 2 (two `TechnologySlim` gaps found)

Grounding the render surfaced two fields the canvas needs that the shipped slim projection
(`project-technology-slim.util.ts`) does **not** carry — both additive, both flagged here:

1. **No folder discriminator.** The slim projects `folders[0].position` but drops the folder
   `name`, so `index:list` rows cannot be filtered to `air_techs_folder`. Added `folderName` to
   `TechnologySlim`.
2. **No sub-tech parent link.** `sub_technologies` is on the full `TechnologyEntity` but not the
   slim, so a `sub` node cannot find its parent (gate 5). Added `subTechnologies` to
   `TechnologySlim`.

Both extend the slim toward its stated purpose ("exactly what a canvas node and its edges need",
ADR 024 decision 4). Their projection spec gains assertions (a change to an existing spec,
noted against regression gate 1 — additive, existing assertions preserved).

The gridbox binding itself is computed renderer-side from `(slim rows + folder geometry)`:
gridbox name → seed id (`name` minus `_tree`) → `path`-component → local placement. No engine
guesswork; the rule reads entirely off shapes already on the wire.
