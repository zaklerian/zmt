# ZMT-44 — Node icon sprite-name convention — Step 1 grounding report

- **Ticket**: ZMT-44 — Tech-tree canvas (fidelity): icons, node kinds, dependencies overlay, selection
- **Date**: 2026-08-11
- **ADR**: 026 (canvas), decision 5 (icon sprite-name = grounding step). Closes the icon-sprite half of ledger `L-022` (the node→gridbox half closed by ZMT-43).
- **Corpus**: BICE at `/home/user/test-mod-bice` (`ZMT_GROUNDING_CORPUS`). Never vendored; never modified.
- **Files read**:
  - `common/technologies/air_techs.txt` (the base plane tree, 44 tokens)
  - `interface/Technologies.gfx` (the `_medium` sprite convention, non-air example)
  - `interface/Technologies_unique.gfx` (the air techs' own `GFX_<token>_medium` sprites)
  - `interface/countrytechtreeview.gui` (the `air_techs_folder` container, line 3799+)
  - `common/units/equipment/_airframe_fighter.txt` (the enabled equipment's own `picture`)

## Headline

**One derivation rule serves every node kind:**

> **A technology's tech-tree node icon is the sprite `GFX_<technologyToken>_medium`, resolved by
> name through the ZMT-39/40 asset stack. The token is the technology's own id; the `GFX_` prefix
> and `_medium` suffix are literal. A token with no such sprite resolves `unresolved` and drives the
> fallback — no crash, no empty node.**

This **diverges from the assumption embedded in the prompt's Step 1 Q2** and is flagged per the
standing acceptance criterion (see _Divergence_ below): a wide (`enable_equipments`) node does **not**
reach a distinct equipment-derived sprite. It shows its **own** `GFX_<token>_medium`, exactly like a
simple node. There is no second sprite source to establish.

## Evidence

### 1. The `_medium` convention (simple/non-air example)

`Technologies.gfx:4-5` — a plain technology's icon is `GFX_<token>_medium`, texture keyed by the
tech token:

```
name = "GFX_fuel_medium"
texturefile = "gfx/interface/technologies/fuel_medium.dds"
```

### 2. Wide air techs carry their OWN `GFX_<token>_medium` (not an equipment sprite)

`Technologies_unique.gfx` declares one `GFX_<token>_medium` per positioned air tech, keyed by the
**technology** token, whose texture happens to depict the plane:

```
Technologies_unique.gfx:2844   name = "GFX_early_fighter_medium"   → …/GENERIC/AXIS_fighter_he51.dds
Technologies_unique.gfx:2853   name = "GFX_fighter1_medium"        → …/GENERIC/ALLIES_fighter_hurricane.dds
Technologies_unique.gfx:2880   name = "GFX_multi_role1_medium"     → …/GENERIC/…
```

`fighter1` is a wide tech: `air_techs.txt:214` `fighter1 = {`, `:216-217`
`enable_equipments = { fighter_equipment_1936 }`. Its icon is `GFX_fighter1_medium` — the tech's own
sprite.

### 3. The enabled equipment's art is a DIFFERENT, unreachable source

The enabled equipment carries its own picture, used by the production / equipment UI, **not** the
tech tree:

```
_airframe_fighter.txt:136   fighter_equipment_1936 = { … }
_airframe_fighter.txt:9     picture = archetype_fighter_equipment
```

That picture token is `archetype_fighter_equipment`, and there is **no** `GFX_fighter_equipment_*_medium`
sprite anywhere in the corpus (`grep` over every `.gfx`: zero hits). So a canvas that tried to reach
"the equipment icon" via the enabled equipment token would resolve nothing. The wide box in-game shows
the plane because the tech's own `GFX_<token>_medium` texture is a plane — not because the node dereferences
the equipment.

### 4. The `.gui` declares no per-tech icon — the name is an engine convention

`countrytechtreeview.gui:3801` `name = "air_techs_folder"` opens the air folder container; it declares
the background, the gridboxes, and the year gutter (ADR 025), but **no per-technology icon element**.
Tech nodes are engine-generated, so the icon sprite name is a naming convention (`GFX_<token>_medium`),
not a reference read from the `.gui`. The canvas reproduces the convention renderer-side; nothing on the
wire needs to carry it.

## Confirmation against real techs (Step 1 gate 3)

`sprite = "GFX_" + token + "_medium"`, checked against every `GFX_*_medium` declared in `interface/*.gfx`
(8990 sprites):

| Token             | nodeKind | `GFX_<token>_medium` present?        | Resolves to               |
| ----------------- | -------- | ------------------------------------ | ------------------------- |
| `fighter1`        | wide     | yes (`Technologies_unique.gfx:2853`) | icon                      |
| `early_fighter`   | wide     | yes (`:2844`)                        | icon                      |
| `multi_role1`     | wide     | yes (`:2880`)                        | icon                      |
| `naval_bomber1`   | wide     | yes                                  | icon                      |
| `generic_fighter` | simple   | **no**                               | **unresolved → fallback** |
| `cv_fighter1`     | sub      | **no**                               | **unresolved → fallback** |

Every one of the 30 positioned wide air techs has its `GFX_<token>_medium`. The **12** air tokens with
no sprite are exactly the 3 hidden generic roots (`generic_fighter`, `generic_bomber`,
`generic_strategic_bomber` — `allow = { always = no }`, `simple`) and the 9 `cv_*` carrier sub-technologies
(`sub`). These are among the ~20 the corpus survey flagged; each resolves `unresolved` and must drive the
fallback, not a crash. Note `cv_fighter1` **enables equipment** (`air_techs.txt:275-276`) yet still has no
icon sprite and no position — confirming the rule keys on the **token**, never on the enabled equipment.

## Divergence from the prompt (standing acceptance criterion)

The prompt's Step 1 Q2 anticipated a **distinct equipment-icon source** for wide nodes ("does the node
show the tech's own icon or the equipment's icon … resolved via the enabled equipment") and Step 2 said
"Wide nodes use the equipment-icon source **if Step 1 establishes one distinct** from the simple-node
source." **Step 1 establishes none.** BICE shows a single derivation — `GFX_<token>_medium` — for simple
and wide alike; the enabled equipment's `picture` is a separate production-UI sprite the tech tree never
dereferences. Implemented to what BICE shows: one sprite rule for all kinds, the wide-vs-simple difference
carried entirely by the **box** (ADR 026 D3), not by the icon source. The Q2 conditional therefore selects
"tech's own icon," and no equipment-resolution path is built (it would resolve nothing and add dead
abstraction against the overengineering gate, req 7).

## Consequences for Step 2

- Icon sprite name is a **pure function of the token** (`nodeIconSprite(token) → GFX_<token>_medium`),
  derived renderer-side — no `TechnologySlim` change, no new channel. The name goes straight to the
  existing `asset:image` client (ZMT-40).
- The two negatives (`unresolved`, `unsupported`) and the pre-resolve `loading` state all render the same
  labeled fallback; only `ok` swaps in the `<img>`. The generic roots and `cv_*` subs exercise the
  fallback with real data.
- `nodeKind` drives the box (wide / simple / sub), **not** the icon source — the icon rule is uniform.
