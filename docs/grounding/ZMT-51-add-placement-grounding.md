# ZMT-51 — Add placement — grounding report

- **Ticket**: ZMT-51 — Add technology (baseline)
- **Date**: 2026-08-19
- **ADR**: 028 (edit model, D2/D4/D5/D6), 027 (write boundary, D4 insert), 026 / 025 (canvas, geometry). Inherits ledger `L-023` (closed by ZMT-50) and `L-024`; opens `L-025`.
- **Corpus**: BICE at `/home/user/test-mod-bice` (`ZMT_GROUNDING_CORPUS`). Never vendored; never modified.
- **Files read**:
  - `interface/countrytechtreeview.gui` — the `air_techs_folder` container: four `gridboxtype` blocks (lines 4071–4098) and the `air_techs_years_left` gutter (lines 3836–3911)
  - `common/technologies/air_techs.txt` — the base plane tree, 44 tokens, 35 positioned

## Headline

**The ticket's free-placement rule — "write the `position` relative to the gridbox
whose area contains the click, determined from the geometry areas" — is
ungroundable, and implementing it would misplace nodes.** Per the standing
acceptance criterion, Add is implemented to what the geometry shows and the
divergence is recorded here and in the PR body rather than silently resolved.

Two independent findings force the divergence.

### Finding 1 — the declared gridbox areas do not contain their own technologies

`air_techs_folder`'s four gridboxes declare (or omit) a `size`. Measuring where the
technologies bound to each gridbox (the ZMT-43 component rule) actually render:

| Gridbox                         | origin    | declared `size` | declared area (x) | its techs render at (x)    |
| ------------------------------- | --------- | --------------- | ----------------- | -------------------------- |
| `tech_air_engine_jet_tree`      | `190,172` | **none**        | —                 | binds no technology        |
| `generic_fighter_tree`          | `340,32`  | `400 × 1000`    | 340 – 740         | **270 – 1110**             |
| `generic_bomber_tree`           | `1075,32` | `400 × 1000`    | 1075 – 1475       | **1495 – 1775** (disjoint) |
| `generic_strategic_bomber_tree` | `1610,32` | `200 × 1000`    | 1610 – 1810       | **2240 – 3430** (disjoint) |

- Two of the three declared areas are **entirely disjoint** from the content they
  own. The strategic-bomber area ends at x=1810; its own technologies start at
  x=2240 and run to 3430 — 1620px outside it.
- The one area that overlaps its content (`generic_fighter_tree`) contains neither
  end of it: fighter technologies run 270–1110 against a 340–740 area.
- `generic_bomber_tree`'s area (1075–1475) covers pixels where **fighter-component**
  nodes render (`multi_role1` at x=1110). An area hit-test there would hand the
  click to a gridbox whose nodes are 400px further right.
- The tech area itself is `3720 × 1300`; the declared areas cover roughly a quarter
  of its width and none of the right half at all. Most clicks would hit no area.

The areas are decorative in this `.gui` — the engine's gridboxes lay content out by
`position` + `slotsize` and overflow their declared `size` freely. Nothing in the
geometry maps a pixel to "the gridbox that owns this region".

### Finding 2 — no per-click frame can round-trip, because the file records no frame

Even with a working hit-test, the rule cannot satisfy the ticket's own gate ("a
disconnected tech reloads where it was placed"). What is written to disk for a
free-placed technology is a **cell** plus `folder.name` — nothing records which
gridbox the cell was measured in. So the reload frame must be a function of the
cell alone, and the write frame must be the _same_ function, or the node moves on
reload.

A per-click frame is not such a function. Worked example against the real numbers:
a click at x=1600 sits in `generic_bomber_tree`'s declared area, giving cell
x = round((1600−1075)/70) = 8. On reload, cell 8 is equally consistent with
`generic_fighter_tree` (340 + 8×70 = 900, inside the fighter band) and with
`generic_bomber_tree` (1635). Two gridboxes claim the same cell; whichever the
reload picks, one of the two placements is wrong by 735px.

## The rule implemented instead (baseline)

> **A disconnected technology's `position` is measured in the folder's ANCHOR
> gridbox — the first one the folder declares.** The write frame and the reload
> fallback frame are the same deterministic function of the folder, so a
> free-placed technology reloads at exactly the cell it was written to.

Two consequences worth stating:

- In BICE the anchor is `tech_air_engine_jet_tree` — the one gridbox **no component
  binds to** (its seed technology `tech_air_engine_jet` is not in `air_techs.txt`;
  ZMT-43 established this). Free placement therefore never contends with the
  component rule. That is a property of this folder, not of the rule.
- The ZMT-43 binding needed one addition: it partitions by **edges**, so a
  positioned technology in no component bound to nothing and rendered nowhere — a
  free-placed technology vanished the moment it was saved. It now falls back to the
  anchor gridbox, and the component rule reclaims it as soon as it gains an edge.

This is provisional (ledger `L-025`): a free-placed technology that is later
connected jumps to its new component's frame. Snap-on-connect is explicitly the
refactor's job and is out of scope here.

## The rest of the placement math, grounded

### The gutter year that seeds `start_year` (ADR 028 D2)

The gutter is six explicit label instances in `air_techs_years_left`:

| label `position.y` | `text` | `pdx_tooltip` |
| ------------------ | ------ | ------------- |
| 140                | `1933` | `YEAR_1933`   |
| 280                | `1936` | `YEAR_1936`   |
| 420                | `1940` | `YEAR_1940`   |
| 560                | `1944` | `YEAR_1944`   |
| 700                | `1945` | `YEAR_1946`   |
| 840                | `1946` | `YEAR_1946`   |

Node rows land exactly **32px below** their label (`origin.y` 32 + `cell.y × 70`
vs `cell.y × 70`), a constant far inside the 140px label spacing — so
**nearest-label in absolute pixel space** resolves every row exactly, with no
per-folder constant to carry. Matching by _cell_ would be wrong: each gridbox
applies its own origin, so the same cell is a different row per gridbox (the
anchor's origin.y is 172, not 32).

`text` wins over `tooltip`: the label at y=700 prints `1945` under tooltip
`YEAR_1946`, the same text/tooltip divergence ADR 025 recorded. The tooltip is the
fallback for a label that prints no year.

`start_year`, `position.y`, and the gutter year stay three distinct quantities
(ADR 025 / ADR 028 D2): the gutter year seeds the `start_year` **default** at
creation and never again.

### The add-as-child offset

BICE air families step exactly one year-row per tier at a fixed column — `@MTR`
(x=11) appears at `@1936`=4, `@1940`=6, `@1944`=8; `@NAV_BMB`, `@LGT_BMB`,
`@MED_BMB` and `@INT` do the same. The folder's year symbols are two cells apart.
"The next tier down, same column" is therefore `y + 2`, which is the implemented
`CHILD_CELL_OFFSET`.

### Safe position

Occupancy is compared in **pixels**, not cells, because the canvas draws every
gridbox's nodes into one plane — an in-gridbox cell clash and a cross-gridbox
visual clash are the same defect and only pixels see both. In this geometry the
cross-gridbox case never actually fires: the four origins are mutually misaligned
modulo the 70px step (340 → 1075 is 735, 1075 → 1610 is 535), so no cell of one
gridbox shares a pixel with a cell of another. Pinned as a spec so an aligned
future geometry is a visible change rather than a silent one.

### The insert parent

Every `common/technologies/*.txt` in BICE roots its entities in one top-level
`technologies = { … }` block, so the ADR 027 D4 insert's `parentName` is
`technologies`. (The insert addresses a parent BLOCK, not a file offset.)

### The loc half is always an insert

Inherited from ZMT-50's grounding §4 and ledger `L-024`: a brand-new token owns no
loc key anywhere, so Add's localisation operation is always a **loc `insert`** into
the ADR 028 D6 default target — never a `set`, and never the delete-then-insert
D4 describes for an autogen rename. On Add this is not merely the common case, it
is the only one.

## What was NOT changed

- The ZMT-43 component rule itself. The anchor fallback runs only for a positioned
  technology that no component claims; every technology in BICE's air folder is
  claimed, so the 35-node render is byte-for-byte the ZMT-43/44 render.
- `start_year` / `position` coupling. They remain independent (ADR 028 D2).
- The edit path's frozen token (ZMT-50 Q89/Q90). Add is where token derivation is
  safe — a new technology has no inbound references to orphan — and it is the first
  consumer of `technology-token.util`.
