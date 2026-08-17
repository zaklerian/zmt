# ZMT-50 — Technology token ↔ localisation grounding (closes L-023)

Ground truth for the two shape-sensitive rules ADR 028 deliberately did **not**
assert (ledger `L-023`): the **autogen normalization rule** and the **loc-key
derivation**. Every figure below is measured from `test-mod-bice` in-session —
`common/technologies/*.txt` (2 670 technology tokens across 46 files) and
`localisation/english/*.yml` (156 198 loc keys across 190 files). Nothing here is
recalled.

## 1. Token convention

**Shape.** `[a-z0-9_]+` — lowercase, digits, `_` as the word separator. Measured
over all 2 670 tokens:

| Property                       | Count        |
| ------------------------------ | ------------ |
| Total tokens                   | 2 670        |
| Containing an uppercase letter | 69 (2.6 %)   |
| Containing a digit             | 1 521 (57 %) |
| Containing `-`, `.` or a space | 0            |
| Beginning with a digit         | 0            |

Full observed charset: `0123456789ABCEGHILMOPQRSTVW_abcdefghijklmnopqrstuvwxyz`.
The 69 uppercase tokens are vanilla-inherited (`CAS1`, `cv_CAS1`, `HVantiair2`,
`Hvartillery1`); every BICE-authored air technology is lowercase. The convention
autogen must produce is therefore **lowercase `[a-z0-9_]`, `_`-separated, never
leading-digit**.

**Tokens are semantic/authored, not slugs of display names.** Of the 2 408
technologies that carry an English name key, only **222 (9.2 %)** have a token
equal to `normalize(name)`. The other 2 186 (90.8 %) do not. Cited pairs:

| Token                             | Loc value (name key)      | `normalize(name)` would be |
| --------------------------------- | ------------------------- | -------------------------- |
| `tech_bf_110_fighter_equipment_1` | `Bf 110 B`                | `bf_110_b`                 |
| `tech_raf`                        | `Royal Air Force`         | `royal_air_force`          |
| `soviet_air_tech`                 | `Voyenno-Vozdushnye Sily` | `voyenno_vozdushnye_sily`  |
| `tech_spitfire_equipment_1`       | `Supermarine Spitfire`    | `supermarine_spitfire`     |
| `panzerschiffe`                   | `Panzerschiffe Design`    | `panzerschiffe_design`     |

The prompt's `fighter1` example is confirmed in the direction it predicted, and
more sharply: `fighter1`, `CAS1`, `cv_fighter1` and the other 35 base
`air_techs_folder` tokens carry **no BICE loc key at all** — their display names
live in vanilla localisation, which this workspace does not contain (see §4).

**Both token states are real on disk, split cleanly by tech family.** Per air
folder, tokens where `token === normalize(name)`:

| Folder                | Techs | With a name key | Autogen-shaped |
| --------------------- | ----- | --------------- | -------------- |
| `air_doctrine_folder` | 40    | 40              | **35**         |
| `luftwaffe_folder`    | 139   | 123             | 0              |
| `britishair_folder`   | 113   | 108             | 0              |
| `japanair_folder`     | 107   | 107             | 0              |
| `usair_folder`        | 121   | 66              | 0              |
| `sovietair_folder`    | 89    | 86              | 0              |
| `italyair_folder`     | 86    | 84              | 0              |
| `frenchair_folder`    | 67    | 64              | 0              |
| `air_techs_folder`    | 35    | **0**           | 0              |

Doctrine techs are autogen-shaped (`air_superiority` ↔ "Air Superiority");
equipment techs are uniformly custom-shaped. ADR 028 decision 4's pivot is
therefore not hypothetical — **both branches are reachable from real BICE data**,
and the edit form must not treat either as the universal case.

## 2. Autogen normalization rule (proposed from the convention; implemented)

`normalizeTechnologyToken(publicName)`:

1. Unicode-decompose (NFKD) and drop combining marks, so `é → e`.
2. Lowercase.
3. Replace every run of non-`[a-z0-9]` with a single `_`.
4. Trim leading/trailing `_`.
5. Empty result, or a leading digit (which no BICE token has), → prefix `tech_`.

Applied to the table in §1 this reproduces exactly the `normalize(name)` column.

**Collision handling is mandatory, not optional.** **64 display names in BICE are
shared by two or more technology tokens** — a normalized token therefore
collides on real data:

| Display name             | Tokens sharing it                                                    |
| ------------------------ | -------------------------------------------------------------------- |
| `Avro Anson`             | `tech_avro_anson_equipment_1`, `tech_avro_anson_scout_equipment_1`   |
| `Supermarine Spitfire V` | `tech_mid_spitfire_equipment_1`, `tech_fra_mid_spitfire_equipment_1` |
| `Royal Air Force`        | `tech_english_aircraft1`, `tech_raf`                                 |
| `Lockheed PV-2 Harpoon`  | `tech_lockheed_pv1_equipment_1`, `tech_lockheed_pv2_equipment_1`     |

**Rule: suffix, never reject.** On collision append `_2`, then `_3`, … until the
token is free across the workspace index. This is BICE's own disambiguation
convention: **152 token families** carry a trailing `_<n>` counter
(`tech_bf_110_fighter_equipment_1 … _5`, `tech_he_111_bomber_equipment_*`).
Rejecting would block a legitimate rename; suffixing matches what the corpus does.

## 3. Loc-key derivation

**The name key is exactly `<token>`** — no prefix, no suffix. 2 408 of 2 670
technology tokens resolve to a loc key of their own name. Cited pairs:

```
 air_superiority:0 "Air Superiority"                     localisation/english/research_l_english.yml:547
 tech_bf_110_fighter_equipment_1:0 "Bf 110 B"            localisation/english/equipment_l_english_GER.yml:1176
 tech_spitfire_equipment_1:0 "Supermarine Spitfire"      localisation/english/equipment_l_english_Commonwealth.yml:2332
```

**The description key is `<token>_desc`**, and it is **optional**. Present for
1 557 of 2 670 tokens (58 %). Cited pairs, immediately following their name key:

```
 air_superiority_desc:0 "Achieving Air Superiority will make it more difficult…"     research_l_english.yml:548
 tech_bf_110_fighter_equipment_1_desc:0 "The Bf 110 B introduces a modified nose…"   equipment_l_english_GER.yml:1177
```

The Commonwealth air techs (`tech_avro_lancaster_equipment_1`, …) carry a name key
and **no** `_desc` — so a derivation that assumes `_desc` exists is wrong on real
data. The implementation deletes a `_desc` key only when it is present.

**Third derived key: `<token>_short`, rare.** 24 of 2 670 tokens (0.9 %), all
naval-hull techs (`basic_ship_hull_carrier_short`, `early_ship_hull_submarine_short`
in `nrm_research_l_english.yml`). Not produced by autogen; carried through the
autogen-rename cleanup because leaving it behind orphans it exactly as a stale
name key would. No other suffix reaches materiality — the next-largest derived
suffix over a technology token is `_2` at 12 occurrences, which is a _different
technology's_ token, not a derived key of this one.

**Version suffix.** Every cited technology key is `:0`. The loc-lines strategy
already preserves whatever version a key carries and writes `:0` on insert
(ZMT-48 grounding), so nothing here changes it.

## 4. Divergence from ADR 028 to flag (standing acceptance criterion)

**None of the 35 base `air_techs_folder` technologies — the exact set the ZMT-43/44
canvas renders — has a loc key in BICE.** Their names come from vanilla
localisation, which is not part of this workspace. Two consequences ADR 028 does
not anticipate:

1. The public-name field opens **empty** for a base air tech and its first save is
   a loc **`insert`**, not a `set`. ADR 028 decision 4 describes rename as `set`
   (custom) or delete+insert (autogen); the "no key yet" third case is real and is
   the _common_ case on the PoC folder. Implemented as insert-into-default-target.
2. That insert is the create-override shape ADR 027 decision 5 designs and defers —
   but for **localisation**, not for the technology script file, and it needs no
   new machinery: the loc-lines strategy already has an `insert` delta kind. The
   `.txt` half still resolves to BICE as ADR 027 decision 5 verified.

Also recorded, and fixed in this ticket: `EntityProvenance` (ADR 024) carried the
winning **source root** but not the **file within it**, so a canvas-opened form had
no `relativePath` to write to — the ML form gets one only because it was opened
_from_ a file. `relativePath` is now part of provenance.
