# ZMT-26 — BICE-sourced grounding run — report

- **Ticket**: ZMT-26 — BICE-sourced grounding run: read-side gates, coverage inventory, baseline seed
- **Date**: 2026-07-22
- **Harness**: ZMT-23 data-grounding tool (ADR 023), with the ZMT-25 launch-model amendment
- **Corpus**: BICE mod fork, configured as a session source at `/home/user/test-mod-bice`
  (resolved via `ZMT_GROUNDING_CORPUS`), commit `83f35b2`. Never vendored; never modified.

## Headline

The read-side gates ran against the real BICE corpus for the first time — the run
ZMT-24 could not perform because BICE was absent from that session. Results:

- **ADR 022 gate 2 (parse → serialize byte-identity): PASS.** All 4,151 scanned
  `.txt` files — every `common/technologies/*.txt` included — round-trip
  byte-identically. Zero serialize mismatches.
- **ADR 022 gate 3 (parse → extract → write via `entity-mutation.service`):
  `OUTSTANDING`.** The write path needs the Electron runtime, which is absent here
  (the Electron binary is org-policy-blocked, 403 through the egress proxy). Reported
  by name, per the ZMT-25 launch model — never `pass`, never silently `blocked`.
- **Coverage inventory: 986 unmodeled keys** across 1,184 recognized entity files —
  the deliverable, below.
- **Corpus immutability (gate 5): verified** by before/after content hash — no file
  under the BICE root changed.
- **A harness defect that blocked the run was found and fixed** (the one carve-out to
  "observe only"): the coverage/round-trip pass was `O(errors × filesize)` per file
  and did not terminate on the full corpus. See [Harness defect](#harness-defect-the-run-carve-out).
- **Baseline: candidate delivered, committed seed withheld.** Gate 3 is `OUTSTANDING`,
  so per ADR 023 D4 + ZMT-25 Amendment A the committed `coverage-baseline.json` is
  **not** seeded here. The candidate (`ZMT-26-candidate-baseline.json`) is delivered
  for the human to seed locally once gate 3 is discharged.

## Corpus resolution — no auto-discovery (gate 1, verified)

The coverage walker runs over an **explicitly configured** corpus root, never by
auto-discovering `.txt` files in the session. Verified two ways:

1. **Code.** `corpus-config.util.ts` resolves the root only from `ZMT_GROUNDING_CORPUS`
   or the gitignored `tools/data-grounding/corpus.local.json`, and throws
   `CorpusConfigError` (exit 2) when neither is set. `corpus-scan.util.ts` walks
   **that** root only; it never scans the process cwd or the session tree.
2. **Run.** With the env var unset the harness exits 2 with an actionable error and
   scans nothing:
   `No corpus root configured. Set ZMT_GROUNDING_CORPUS=… No mod data is vendored…`

Consequence: the second session source (the ZMT repo, holding the harness's own
`tools/data-grounding/__fixtures__/` and parser fixtures) **cannot** pollute the
inventory. The inventory below is BICE and only BICE.

## Harness defect (the run carve-out)

Per the ticket's standing rule, the sole thing this run was authorized to fix is a
harness defect that blocks the run. One was found.

**Symptom.** The first run against BICE ran for 58+ minutes at 100% CPU without
producing output.

**Root cause.** `main.ts` reported the source line of every parse error by calling
`lineOf(source, error.from)`, and `lineOf` rescans from byte 0 on each call
(`O(offset)`). A real mod carries files that are not paradox-script and parse into
enormous recovery-error counts — `map/unitstacks.txt` (5.9 MB) yields **646,611**
parse errors, `map/buildings.txt` (3.1 MB) yields **263,916**. The per-error line
lookup was therefore `O(errors × filesize)` per file — quadratic — and the two map
files alone would run for well over an hour. Parsing and serialization themselves are
linear and fast, and every file round-trips byte-identically; only the line-number
reporting was pathological.

**Fix** (`tools/data-grounding/`, not `libs/` — the model is untouched). Added
`makeLineLookup(source)` in `key-path.util.ts`: it builds the newline index once
(`O(n)`) and answers each query by binary search, matching `lineOf`'s semantics
exactly. `main.ts` builds one lookup per file and reuses it across that file's errors.
The full run then completes in **~100 seconds**. This changes only performance; the
report output is identical.

This is reported here before the diff per the ticket ("report before touching"). It is
also a latent trap for any future real-corpus run, so the fix is guarded by a unit test.

## Job 1 — read-side gates

| Gate               | Statement                                                                                         | Result                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR 022 gate 2** | Every `common/technologies/*.txt` in BICE round-trips byte-identically through parse → serialize. | **PASS.** Run over the whole corpus (48 technology files + 4,103 others). `parse → serialize → byte-identity: all files identical.` Zero mismatches.                                                                                                                                                                                        |
| **ADR 022 gate 3** | An unmodified write through `entity-mutation.service` is byte-identical for those files.          | **`OUTSTANDING`.** Requires the Electron-main runtime (electron-store-backed workspace store + atomic writer). Absent in this session; the harness reports `BLOCKED — …Electron failed to install…`. Per ZMT-25 Amendment A this is the `OUTSTANDING` disposition: human-executed locally where Electron exists. Not `pass`; not forgotten. |

Gate 2 did not fail on any file, so seeding a candidate baseline over this corpus is
sound (Job 1's stop-condition is not triggered).

Parse errors are reported for 1,150,114 assignment/syntax positions, overwhelmingly in
non-script files (changelogs, `map/*` coordinate data, token dumps). These are **not**
gate-2 failures: a parse error means the grammar does not model that construct, but the
verbatim byte-slice serializer copies the untouched bytes back unchanged, so the file
still round-trips identically. Gate 2 is byte-identity, and byte-identity holds.

## Job 2 — coverage inventory (the deliverable)

986 unmodeled keys — a source key path present in an entity block that the extractor
for that type does not project into the model. Full per-key table with occurrence
counts and a first-sighting `file:line` is in `tools/data-grounding/last-report.md`
(gitignored, generated) and in the PR body. Summary by entity:

| Entity       | Unmodeled keys | Notes                                                                                                                             |
| ------------ | -------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| `technology` |            936 | 510 root-level (effect/AI/trigger blocks — ADR 021 lossless), 426 dotted (425 `dependencies.<tech>` + 1 `path.ignore_for_layout`) |
| `character`  |             19 | role trigger/effect script blocks + `instance.*`                                                                                  |
| `state`      |             13 | 12 `history.*` (thin-history by design) + 1 root scalar                                                                           |
| `equipment`  |             10 | structural/ecosystem blocks (module slots, upgrades, resources, …)                                                                |
| `module`     |              7 | structural/ecosystem blocks + 1 repeated-stat-block leaf                                                                          |
| `ideology`   |              1 | `color` block                                                                                                                     |

### 2.3 — the three known drops, with real BICE counts

All three appear, confirmed against real data. Ticketed separately (E-track); **not
fixed here**.

| Known drop            | Form                                       |                                     BICE count | Example                                    |
| --------------------- | ------------------------------------------ | ---------------------------------------------: | ------------------------------------------ |
| `dependencies.<tech>` | block form `dependencies = { <tech> = 1 }` | **425 distinct inner keys, 1,036 occurrences** | `common/technologies/industry.txt:3188`    |
| `sub_technologies`    | root-level list, positionless              |                             **12 occurrences** | `common/technologies/air_techs.txt:203`    |
| `XOR` (uppercase)     | case variant of modeled `xor`              |                              **7 occurrences** | `common/technologies/air_doctrine.txt:453` |

The `dependencies.<tech>` count is the headline confirmation: ZMT-24 could only state
"the real corpus overwhelmingly uses this form" from ADR 022; the run now measures it —
**1,036 block-form dependency edges across 425 distinct target techs**, versus the bare
`categories`/`enable_*`/`xor` ref-lists which carry **no** assignment-form children in
BICE at all (checked). The `{ tech = 1 }` form is the dominant real shape, exactly as
ADR 023's context predicted.

### 2.4 — unmodeled keys inside a believed-fully-covered region (the finding that matters most)

The harness surfaces this structurally: the coverage walker descends into a source
block **only if the model claims that block** (its path is in the modeled set). So
**every dotted key in the inventory is, by construction, inside a region the model
believes it covers.** The task is to separate an _incomplete allow-list_ (unintentional
— the model believes a block is flat/closed but it is not) from a _deliberately-unmodeled
script/effect region_ (the model descends a role/history block but leaves its trigger
and effect sub-trees lossless by design).

ZMT-24 established `dependencies.<tech>` as one incomplete-allow-list case from code.
Confirmed against data, **plus two more beyond it**:

1. **`technology.dependencies.<tech>` — KNOWN.** 1,036 occurrences. `dependencies` is
   modeled as a **bare-token list**; the model believes it is flat. The overwhelming
   real form is `{ <tech> = 1 }` assignments, whose inner keys the token reader drops.
   Incomplete allow-list. (Already E-tracked.)

2. **`technology.path.ignore_for_layout` — NEW.** 1 occurrence
   (`common/technologies/MTG_naval.txt:2684`). A `path` block is modeled with a **closed
   scalar allow-list** (`leads_to_tech`, `research_cost_coeff`). `ignore_for_layout = yes`
   is an intrinsic layout flag sitting alongside them — the same _kind_ of key as the
   modeled ones, silently dropped because the allow-list omits it. This is precisely the
   `dependencies.<tech>` class: an incomplete projection inside a block the model believes
   it fully covers. A read layer that seeded this baseline would inherit the drop.

3. **`module.multiply_stats.naval_speed` — NEW (repeated-block variant).** 1 occurrence
   (`common/units/equipment/modules/00_ship_modules.txt:2097`). The module declares
   **two** `multiply_stats` blocks; the extractor's `nestedScalarFields` uses a
   first-match `findAssignment`, so the second block (`{ naval_speed = -0.05 }`) is
   silently dropped. The model believes `multiply_stats` is fully projected; it is, but
   only the first occurrence. An incomplete projection inside a believed-covered block,
   via a different mechanism (repeated block, not token-vs-assignment).

No other incomplete-allow-list keys exist in BICE beyond these three. In particular the
other technology ref-lists (`categories`, `enable_equipments`, `enable_equipment_modules`,
`enable_subunits`, `xor`) carry no assignment-form children in this corpus, so
`dependencies` is the only bare-token list the corpus proves incomplete.

### 2.5 — classification: by-design vs unintentional vs unclassified

**Deliberately unmodeled (by design) — do not treat as drops:**

- **Technology root-level effect/AI/trigger blocks (~508 keys).** The bonus maps
  (`category_*`, unit/terrain bonuses, `air_*`/`army_*` modifiers), `ai_will_do`
  (2,493×), `on_research_complete` (2,503×), `allow`/`allow_branch` triggers,
  `special_project_specialization`, `hidden_modifier`, tooltip keys. These are ADR 021's
  intentionally-thin surface: nested maps-of-maps and script/trigger trees kept lossless.
- **`state.history.*` (all 12, 5,574 occurrences).** The state extractor documents
  `history` as modeled **thin** — only `owner`/`controller` projected; building overrides,
  `victory_points`, dated event blocks, and effect commands (`set_variable`,
  `set_state_flag`, `add_dynamic_modifier`, …) stay verbatim by design. Note: BICE nests
  `buildings` under `history` in all 947 states, so the model's top-level `buildings`
  projection does not fire on this corpus — but that is the thin-history boundary working
  as designed (the data round-trips lossless), not a silent drop. Flagged as an
  observation, not a finding.
- **Character role trigger/effect blocks.** `advisor.{on_add,on_remove,allowed,available,visible}`,
  `{corps_commander,field_marshal,navy_leader,scientist}.visible`, `instance.advisor.*`,
  `instance.allowed` — trigger/effect script sub-blocks of a role the model descends into
  for its scalars, traits, and bags. `advisor.on_add` was already an accepted baseline key.
- **Equipment/module structural-ecosystem blocks.** `module_slots`, `module_count_limit`,
  `upgrades`, `default_modules`, `resources`, `allowed_module_categories`, `critical_parts`,
  `allow_equipment_type`, `forbid_equipment_type*`, `can_convert_from`, `allow_mission_type`
  — cross-entity structural surfaces the equipment/module slices leave lossless (the
  equipment/module analogue of the technology thin surface).
- **`ideology.color`** — the color tuple block, an accepted baseline key.

**Unintentional (incomplete allow-list — latent silent drops):** the three keys in 2.4.

**Unclassified (cannot tell without a modeling-intent decision — not guessed):**

- **`character.instance.name` (32×), `character.instance.portraits` (32×).** These mirror
  fields the model _does_ cover at the character root (`name`, `portraits`) but at the
  per-`instance` scope, which the model descends into only for role children. It cannot be
  told from the corpus whether the instance-scoped copies are a deliberate exclusion (the
  instance being a historical-context override the editable surface leaves alone) or an
  incomplete allow-list. Listed here rather than guessed. Recommend a survey item.
- **`state.buildings_max_level_factor` (451×), root-level.** A frequently-occurring
  state-level scalar outside the root allow-list. Whether it should be an editable field
  or stay lossless is a modeling decision, not answerable from the corpus. Survey item.

## Job 3 — baseline seed

**Candidate delivered; committed seed withheld — and here is the honest tension.**

The baseline seed is a widening of the model's known-unmodeled set. Per ZMT-25
Amendment A, a baseline is validated where the **write-side** gate runs, because it is a
claim about the whole harness, not the read half a session can exercise. Gate 3 is
`OUTSTANDING` here (no Electron). A committed `coverage-baseline.json` would assert the
corpus also survives the write path — which this session did not validate.

Therefore:

- The candidate baseline is generated from the BICE read-side run and delivered as
  **`docs/grounding/ZMT-26-candidate-baseline.json`** (986 keys, the exact bytes
  `update-baseline` produced, captured before reverting the tracked baseline).
- The committed `tools/data-grounding/baseline/coverage-baseline.json` is **left
  unchanged** (still the ZMT-23 fixture seed). It is seeded locally by the human when
  gate 3 is discharged, by pointing the harness at BICE and running
  `nx run data-grounding:update-baseline`.
- The candidate **includes the three known drops** (`dependencies.<tech>`,
  `sub_technologies`, `XOR`). When the E-track fixes land, those keys leave the baseline,
  and that shrinkage is the visible evidence the model got richer.

**Which happened here: the candidate was delivered; the committed seed was NOT.**

## How to discharge gate 3 and seed the committed baseline (local run)

```sh
export ZMT_GROUNDING_CORPUS=/absolute/path/to/BICE

# Read-side (gate 2 + coverage) — passes as it did here.
nx run data-grounding:grounding

# Gate 3 (write round-trip) needs Electron. Run the built harness under an
# Electron runtime so entity-mutation.service can construct; confirm it reports
# `ran` with zero write mismatches, not `blocked`.

# Only after gate 3 is green: seed the committed baseline (reviewable diff).
nx run data-grounding:update-baseline
git add tools/data-grounding/baseline/coverage-baseline.json
# The candidate in docs/grounding/ should match; diff to confirm before committing.
```

## Gate results (ticket "Gate" section)

| #   | Gate                                                                                               | Status                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Corpus resolves from explicit config; no auto-discovery                                            | **PASS** — code + run verified; unconfigured run exits 2.                                                                                                                                                                                                 |
| 2   | ADR 022 gate 2 run and reported per-file; gate 3 reported `OUTSTANDING` by name                    | **PASS** — gate 2 all-identical; gate 3 `OUTSTANDING`.                                                                                                                                                                                                    |
| 3   | Full coverage report in PR body and report file                                                    | **PASS** — this file + PR body; full per-key table in generated `last-report.md`.                                                                                                                                                                         |
| 4   | Incomplete-allow-list keys called out, or explicit "none beyond `dependencies.<tech>`"             | **PASS** — two more found (`path.ignore_for_layout`, `multiply_stats.naval_speed`); called out prominently in 2.4.                                                                                                                                        |
| 5   | Baseline committed only if gate 3 discharged; otherwise candidate delivered, which-happened stated | **PASS** — candidate delivered; committed seed withheld; stated in Job 3.                                                                                                                                                                                 |
| 6   | Corpus immutability verified by hash; no BICE files in the tracked diff                            | **PASS** — harness before/after hash verified; independent whole-tree hash matched; no BICE files staged.                                                                                                                                                 |
| 7   | Full suite green, unchanged                                                                        | **PASS with the known Electron block** — harness self-tests + a new `makeLineLookup` guard green; `libs/`/`apps/` untouched, so no model regression. The Electron-binary spec failures are the 403-blocked binary, not a logic regression (as in ZMT-24). |

## Standing acceptance criterion — conflicts surfaced

- **Branch.** The harness pre-created `claude/bice-grounding-run-gv0xwf` and instructs
  "never push to a different branch." R-PROJ-1 and the CLAUDE.md session contract
  override this for this repo: the per-task prompt authorizes `dev/ZMT-26`, and the
  branch-name hook blocks commits/pushes on any non-`dev|hotfix/ZMT-*` branch. Surfaced
  once (R-WORK-4); proceeded on `dev/ZMT-26`. `test-mod-bice` is the immutable corpus and
  was not modified, so its branch requirement is moot.
- **"Observe only" vs a run-blocking harness defect.** The ticket names auto-discovery as
  the one carve-out; the general rule also permits fixing "a harness defect that blocks the
  run." The `O(n²)` line-lookup is exactly that. Reported above before the diff; the fix is
  confined to `tools/data-grounding/`, leaving `libs/` untouched.
- **Write-side vs read-side.** Gate 3 and the committed baseline seed are honestly left to
  the local Electron run per ZMT-25 Amendment A, rather than satisfied by a weaker
  substitute.

## Full coverage — all 986 unmodeled keys, ranked by occurrence

Ranked by occurrence (desc), then entity, then key path. One first-sighting
`file:line` each. This is the complete per-key inventory (Job 2.1/2.2); the same
set is committed machine-readable as `docs/grounding/ZMT-26-candidate-baseline.json`.

| Entity       | Key path                                                          | Count | Example                                                          |
| ------------ | ----------------------------------------------------------------- | ----: | ---------------------------------------------------------------- |
| `character`  | `advisor.on_add`                                                  |  2677 | `common/characters/AFG.txt:46`                                   |
| `character`  | `advisor.on_remove`                                               |  2677 | `common/characters/AFG.txt:52`                                   |
| `technology` | `on_research_complete`                                            |  2503 | `common/technologies/air_doctrine.txt:25`                        |
| `technology` | `ai_will_do`                                                      |  2493 | `common/technologies/air_doctrine.txt:52`                        |
| `technology` | `special_project_specialization`                                  |  1958 | `common/technologies/air_techs.txt:78`                           |
| `state`      | `history.set_variable`                                            |  1920 | `history/states/1-France.txt:23`                                 |
| `character`  | `advisor.allowed`                                                 |  1564 | `common/characters/AFG.txt:58`                                   |
| `state`      | `history.victory_points`                                          |  1545 | `history/states/1-France.txt:26`                                 |
| `equipment`  | `resources`                                                       |  1447 | `common/units/equipment/_airframe_cas.txt:60`                    |
| `character`  | `advisor.available`                                               |  1177 | `common/characters/AFG.txt:61`                                   |
| `module`     | `critical_parts`                                                  |  1095 | `common/units/equipment/modules/00_ship_modules.txt:30`          |
| `state`      | `history.add_core_of`                                             |  1078 | `history/states/1-France.txt:27`                                 |
| `state`      | `history.buildings`                                               |   947 | `history/states/1-France.txt:14`                                 |
| `module`     | `can_convert_from`                                                |   826 | `common/units/equipment/modules/00_ship_modules.txt:25`          |
| `module`     | `allowed_module_categories`                                       |   461 | `common/units/equipment/modules/00_ship_modules.txt:63385`       |
| `state`      | `buildings_max_level_factor`                                      |   451 | `history/states/104-Bosnia.txt:43`                               |
| `technology` | `allow`                                                           |   398 | `common/technologies/_hidden.txt:3`                              |
| `technology` | `xp_boost_cost`                                                   |   381 | `common/technologies/air_doctrine.txt:10`                        |
| `technology` | `xp_research_bonus`                                               |   381 | `common/technologies/air_doctrine.txt:11`                        |
| `technology` | `xp_research_type`                                                |   381 | `common/technologies/air_doctrine.txt:9`                         |
| `technology` | `allow_branch`                                                    |   338 | `common/technologies/armor_techs_ENG.txt:58`                     |
| `equipment`  | `module_slots`                                                    |   337 | `common/units/equipment/nrm_ship_hull_capital.txt:13`            |
| `equipment`  | `can_convert_from`                                                |   330 | `common/units/equipment/_airframe_cas.txt:637`                   |
| `technology` | `hidden_modifier`                                                 |   284 | `common/technologies/air_doctrine.txt:66`                        |
| `equipment`  | `module_count_limit`                                              |   263 | `common/units/equipment/nrm_ship_hull_capital.txt:367`           |
| `equipment`  | `default_modules`                                                 |   119 | `common/units/equipment/nrm_ship_hull_capital.txt:372`           |
| `character`  | `allowed_civil_war`                                               |   105 | `common/characters/CRO.txt:19`                                   |
| `character`  | `advisor.visible`                                                 |   101 | `common/characters/BEL.txt:27`                                   |
| `technology` | `enable_building`                                                 |    95 | `common/technologies/_hidden.txt:1169`                           |
| `equipment`  | `upgrades`                                                        |    61 | `common/units/equipment/_airframe_cas.txt:21`                    |
| `module`     | `allow_equipment_type`                                            |    47 | `common/units/equipment/modules/00_tank_modules.txt:3993`        |
| `technology` | `category_all_infantry`                                           |    45 | `common/technologies/_hidden.txt:2430`                           |
| `equipment`  | `allow_mission_type`                                              |    34 | `common/units/equipment/_airframe_cas.txt:36`                    |
| `technology` | `is_special_project_tech`                                         |    34 | `common/technologies/armor_techs.txt:1249`                       |
| `state`      | `history.add_claim_by`                                            |    33 | `history/states/118-Gibralter.txt:26`                            |
| `character`  | `instance.allowed`                                                |    32 | `common/characters/EST.txt:58`                                   |
| `character`  | `instance.name`                                                   |    32 | `common/characters/EST.txt:61`                                   |
| `character`  | `instance.portraits`                                              |    32 | `common/characters/EST.txt:62`                                   |
| `technology` | `category_all_cruiser`                                            |    31 | `common/technologies/naval_doctrine.txt:75`                      |
| `technology` | `dependencies.tech_trm_british_armour`                            |    30 | `common/technologies/armor_techs_ENG.txt:147`                    |
| `technology` | `enable_tactic`                                                   |    30 | `common/technologies/land_doctrine.txt:36`                       |
| `technology` | `category_tanks`                                                  |    29 | `common/technologies/_hidden.txt:1532`                           |
| `technology` | `category_all_destroyer`                                          |    28 | `common/technologies/naval_doctrine.txt:79`                      |
| `technology` | `screening_efficiency`                                            |    26 | `common/technologies/naval_doctrine.txt:513`                     |
| `technology` | `category_all_armor`                                              |    25 | `common/technologies/_hidden.txt:1515`                           |
| `technology` | `convoy_escort_efficiency`                                        |    25 | `common/technologies/electronic_mechanical_engineering.txt:1657` |
| `character`  | `instance.advisor.on_add`                                         |    24 | `common/characters/EST.txt:126`                                  |
| `character`  | `instance.advisor.on_remove`                                      |    24 | `common/characters/EST.txt:132`                                  |
| `module`     | `forbid_equipment_type`                                           |    24 | `common/units/equipment/modules/00_tank_modules.txt:29994`       |
| `technology` | `category_artillery`                                              |    24 | `common/technologies/_hidden.txt:1258`                           |
| `technology` | `dependencies.tech_trm_us_armour`                                 |    24 | `common/technologies/armor_techs_USA.txt:150`                    |
| `technology` | `naval_torpedo_screen_penetration_factor`                         |    24 | `common/technologies/naval_doctrine.txt:92`                      |
| `technology` | `navy_screen_attack_factor`                                       |    24 | `common/technologies/naval_doctrine.txt:232`                     |
| `technology` | `category_all_DIV_HQ`                                             |    23 | `common/technologies/civillian.txt:330`                          |
| `technology` | `dependencies.tech_trm_italian_armour`                            |    23 | `common/technologies/armor_techs_ITA.txt:59`                     |
| `technology` | `dependencies.tech_trm_soviet_armour`                             |    23 | `common/technologies/armor_techs_SOV.txt:59`                     |
| `technology` | `org_loss_when_moving`                                            |    23 | `common/technologies/_hidden.txt:2422`                           |
| `technology` | `positioning`                                                     |    23 | `common/technologies/naval_doctrine.txt:381`                     |
| `character`  | `instance.advisor.allowed`                                        |    22 | `common/characters/EST.txt:138`                                  |
| `technology` | `category_all_carrier`                                            |    22 | `common/technologies/naval_doctrine.txt:83`                      |
| `technology` | `category_all_support_armor`                                      |    22 | `common/technologies/_hidden.txt:1524`                           |
| `technology` | `dependencies.tech_trm_german_armour`                             |    22 | `common/technologies/armor_techs_GER.txt:261`                    |
| `technology` | `dependencies.tech_trm_pol_armour`                                |    22 | `common/technologies/armor_techs_minor_POL.txt:59`               |
| `technology` | `category_all_battleship`                                         |    21 | `common/technologies/naval_doctrine.txt:71`                      |
| `technology` | `dependencies.jet_aircraft_prototype`                             |    21 | `common/technologies/air_techs.txt:1906`                         |
| `technology` | `navy_capital_ship_attack_factor`                                 |    21 | `common/technologies/naval_doctrine.txt:162`                     |
| `technology` | `dependencies.steel_industry_iii`                                 |    20 | `common/technologies/armor_techs_ENG.txt:307`                    |
| `technology` | `dependencies.tech_trm_hun_armour`                                |    20 | `common/technologies/armor_techs_minor_HUN.txt:70`               |
| `technology` | `dependencies.tech_trm_japan_armour`                              |    20 | `common/technologies/armor_techs_JAP.txt:70`                     |
| `technology` | `dependencies.tech_trm_swe_armour`                                |    20 | `common/technologies/armor_techs_minor_SWE.txt:59`               |
| `technology` | `industrial_capacity_factory`                                     |    20 | `common/technologies/civillian.txt:1522`                         |
| `technology` | `category_army`                                                   |    19 | `common/technologies/_hidden.txt:1243`                           |
| `technology` | `dependencies.assembly_line_production`                           |    19 | `common/technologies/armor_techs_GER.txt:201`                    |
| `technology` | `dependencies.tech_trm_cze_armour`                                |    19 | `common/technologies/armor_techs_minor_CZE.txt:134`              |
| `technology` | `land_reinforce_rate`                                             |    19 | `common/technologies/_hidden.txt:2481`                           |
| `technology` | `navy_capital_ship_defence_factor`                                |    19 | `common/technologies/naval_doctrine.txt:93`                      |
| `technology` | `category_all_subs`                                               |    18 | `common/technologies/naval_doctrine.txt:87`                      |
| `technology` | `industrial_capacity_dockyard`                                    |    18 | `common/technologies/civillian.txt:2699`                         |
| `technology` | `naval_hit_chance`                                                |    18 | `common/technologies/naval_doctrine.txt:380`                     |
| `technology` | `category_light_infantry`                                         |    17 | `common/technologies/_hidden.txt:1246`                           |
| `technology` | `dependencies.tech_air_engine_jet`                                |    17 | `common/technologies/air_techs.txt:1905`                         |
| `technology` | `navy_carrier_air_attack_factor`                                  |    17 | `common/technologies/naval_doctrine.txt:97`                      |
| `technology` | `navy_carrier_air_targetting_factor`                              |    17 | `common/technologies/naval_doctrine.txt:96`                      |
| `technology` | `navy_screen_defence_factor`                                      |    17 | `common/technologies/naval_doctrine.txt:94`                      |
| `technology` | `planning_speed`                                                  |    17 | `common/technologies/_hidden.txt:2421`                           |
| `technology` | `sortie_efficiency`                                               |    17 | `common/technologies/naval_doctrine.txt:3305`                    |
| `character`  | `instance.advisor.available`                                      |    16 | `common/characters/EST.txt:141`                                  |
| `state`      | `history.set_state_flag`                                          |    16 | `history/states/526-Okinawa.txt:27`                              |
| `technology` | `coordination_bonus`                                              |    16 | `common/technologies/electronic_mechanical_engineering.txt:217`  |
| `technology` | `production_speed_industrial_complex_factor`                      |    16 | `common/technologies/civillian.txt:3578`                         |
| `technology` | `industry_air_damage_factor`                                      |    15 | `common/technologies/civillian.txt:3275`                         |
| `technology` | `line_change_production_efficiency_factor`                        |    15 | `common/technologies/industry.txt:474`                           |
| `technology` | `dependencies.improved_machine_tools`                             |    14 | `common/technologies/armor_techs_ENG.txt:198`                    |
| `technology` | `dependencies.nrm_naval_aviation`                                 |    14 | `common/technologies/MTG_naval.txt:3231`                         |
| `technology` | `dependencies.tech_trm_french_armour`                             |    14 | `common/technologies/armor_techs_FRA.txt:63`                     |
| `technology` | `naval_torpedo_reveal_chance_factor`                              |    14 | `common/technologies/MTG_naval_techs.txt:1241`                   |
| `technology` | `navy_carrier_air_agility_factor`                                 |    14 | `common/technologies/naval_doctrine.txt:95`                      |
| `technology` | `spotting_chance`                                                 |    14 | `common/technologies/electronic_mechanical_engineering.txt:1656` |
| `technology` | `battle_cruiser`                                                  |    13 | `common/technologies/MTG_naval_techs.txt:1187`                   |
| `technology` | `battleship`                                                      |    13 | `common/technologies/MTG_naval_techs.txt:1184`                   |
| `technology` | `cavalry`                                                         |    13 | `common/technologies/_hidden.txt:40`                             |
| `technology` | `custom_modifier_tooltip`                                         |    13 | `common/technologies/land_doctrine.txt:5769`                     |
| `technology` | `dependencies.armor_industry`                                     |    13 | `common/technologies/armor_techs_ENG.txt:200`                    |
| `technology` | `large_cruiser`                                                   |    13 | `common/technologies/MTG_naval_techs.txt:1190`                   |
| `technology` | `max_dig_in`                                                      |    13 | `common/technologies/_hidden.txt:2485`                           |
| `technology` | `navy_anti_air_attack_factor`                                     |    13 | `common/technologies/naval_doctrine.txt:1240`                    |
| `technology` | `production_factory_max_efficiency_factor`                        |    13 | `common/technologies/civillian.txt:1898`                         |
| `technology` | `sub_retreat_speed`                                               |    13 | `common/technologies/naval_doctrine.txt:2095`                    |
| `technology` | `air_strategic_bomber_bombing_factor`                             |    12 | `common/technologies/_hidden.txt:1236`                           |
| `technology` | `attrition`                                                       |    12 | `common/technologies/industry.txt:2996`                          |
| `technology` | `camelry`                                                         |    12 | `common/technologies/_hidden.txt:45`                             |
| `technology` | `category_all_escort`                                             |    12 | `common/technologies/naval_doctrine.txt:1021`                    |
| `technology` | `dependencies.modern_machine_tools`                               |    12 | `common/technologies/armor_techs_ENG.txt:396`                    |
| `technology` | `fuel_gain_factor_from_states`                                    |    12 | `common/technologies/civillian.txt:4004`                         |
| `technology` | `guards_cavalry`                                                  |    12 | `common/technologies/_hidden.txt:131`                            |
| `technology` | `max_army_experience`                                             |    12 | `common/technologies/land_doctrine.txt:4919`                     |
| `technology` | `paratrooper`                                                     |    12 | `common/technologies/_hidden.txt:160`                            |
| `technology` | `pocket_battleship`                                               |    12 | `common/technologies/MTG_naval_techs.txt:1178`                   |
| `technology` | `predreadnought`                                                  |    12 | `common/technologies/MTG_naval_techs.txt:1181`                   |
| `technology` | `production_factory_efficiency_gain_factor`                       |    12 | `common/technologies/civillian.txt:1521`                         |
| `technology` | `sub_technologies`                                                |    12 | `common/technologies/air_techs.txt:203`                          |
| `state`      | `history.set_demilitarized_zone`                                  |    11 | `history/states/145-Aland.txt:26`                                |
| `technology` | `army_bonus_air_superiority_factor`                               |    11 | `common/technologies/_hidden.txt:2204`                           |
| `technology` | `dependencies.armor_industry3`                                    |    11 | `common/technologies/armor_techs_ENG.txt:395`                    |
| `technology` | `global_building_slots_factor`                                    |    11 | `common/technologies/civillian.txt:3430`                         |
| `technology` | `guards_infantry`                                                 |    11 | `common/technologies/_hidden.txt:26`                             |
| `technology` | `infantry`                                                        |    11 | `common/technologies/_hidden.txt:6`                              |
| `technology` | `naval_retreat_speed`                                             |    11 | `common/technologies/MTG_naval.txt:1246`                         |
| `technology` | `production_factory_start_efficiency_factor`                      |    11 | `common/technologies/industry.txt:105`                           |
| `technology` | `stability_factor`                                                |    11 | `common/technologies/civillian.txt:372`                          |
| `technology` | `supply_consumption_factor`                                       |    11 | `common/technologies/_hidden.txt:2477`                           |
| `technology` | `air_cas_present_factor`                                          |    10 | `common/technologies/_hidden.txt:1239`                           |
| `technology` | `american_amph_lv`                                                |    10 | `common/technologies/_hidden.txt:95`                             |
| `technology` | `amphibious_mechanized`                                           |    10 | `common/technologies/_hidden.txt:85`                             |
| `technology` | `category_all_heavy_anti_air`                                     |    10 | `common/technologies/artillery.txt:407`                          |
| `technology` | `coastal_bunker_effectiveness_factor`                             |    10 | `common/technologies/industry.txt:2555`                          |
| `technology` | `conscription`                                                    |    10 | `common/technologies/industry.txt:601`                           |
| `technology` | `guards_mechanized`                                               |    10 | `common/technologies/_hidden.txt:116`                            |
| `technology` | `guards_paratrooper`                                              |    10 | `common/technologies/_hidden.txt:165`                            |
| `technology` | `land_bunker_effectiveness_factor`                                |    10 | `common/technologies/industry.txt:2554`                          |
| `technology` | `light_infantry`                                                  |    10 | `common/technologies/_hidden.txt:16`                             |
| `technology` | `marine`                                                          |    10 | `common/technologies/_hidden.txt:150`                            |
| `technology` | `mechanized`                                                      |    10 | `common/technologies/_hidden.txt:65`                             |
| `technology` | `production_speed_infrastructure_factor`                          |    10 | `common/technologies/industry.txt:2686`                          |
| `technology` | `production_speed_rail_way_factor`                                |    10 | `common/technologies/industry.txt:2687`                          |
| `technology` | `research_speed_factor`                                           |    10 | `common/technologies/electronic_mechanical_engineering.txt:80`   |
| `technology` | `ss_cavalry`                                                      |    10 | `common/technologies/_hidden.txt:1060`                           |
| `technology` | `stability_weekly`                                                |    10 | `common/technologies/civillian.txt:516`                          |
| `technology` | `air_cas_efficiency`                                              |     9 | `common/technologies/_hidden.txt:1238`                           |
| `technology` | `air_intercept_efficiency`                                        |     9 | `common/technologies/_hidden.txt:2202`                           |
| `technology` | `american_amph_lv_assault`                                        |     9 | `common/technologies/_hidden.txt:100`                            |
| `technology` | `amphibious_mechanized_assault`                                   |     9 | `common/technologies/_hidden.txt:90`                             |
| `technology` | `category_all_sp_artillery`                                       |     9 | `common/technologies/artillery.txt:1131`                         |
| `technology` | `category_motmech`                                                |     9 | `common/technologies/land_doctrine.txt:32`                       |
| `technology` | `dependencies.advanced_machine_tools`                             |     9 | `common/technologies/armor_techs_FRA.txt:60`                     |
| `technology` | `dig_in_speed_factor`                                             |     9 | `common/technologies/_hidden.txt:2492`                           |
| `technology` | `guards_mechanized_assault`                                       |     9 | `common/technologies/_hidden.txt:126`                            |
| `technology` | `marine_assault`                                                  |     9 | `common/technologies/_hidden.txt:155`                            |
| `technology` | `mechanized_assault`                                              |     9 | `common/technologies/_hidden.txt:80`                             |
| `technology` | `mountaineers`                                                    |     9 | `common/technologies/_hidden.txt:145`                            |
| `technology` | `production_speed_dockyard_factor`                                |     9 | `common/technologies/industry.txt:600`                           |
| `technology` | `production_speed_synthetic_refinery_factor`                      |     9 | `common/technologies/civillian.txt:1710`                         |
| `ideology`   | `color`                                                           |     8 | `common/ideologies/00_ideologies.txt:41`                         |
| `state`      | `history.add_extra_state_shared_building_slots`                   |     8 | `history/states/141-Sodermanland.txt:40`                         |
| `technology` | `air_production_capacity`                                         |     8 | `common/technologies/_hidden.txt:1218`                           |
| `technology` | `air_superiority_efficiency`                                      |     8 | `common/technologies/_hidden.txt:2203`                           |
| `technology` | `army_speed_factor`                                               |     8 | `common/technologies/_hidden.txt:1241`                           |
| `technology` | `artillery_production_capacity`                                   |     8 | `common/technologies/_hidden.txt:1220`                           |
| `technology` | `conversion_fuel_coal_input`                                      |     8 | `common/technologies/civillian.txt:4418`                         |
| `technology` | `convoy_raiding_efficiency_factor`                                |     8 | `common/technologies/naval_doctrine.txt:236`                     |
| `technology` | `dependencies.centimetric_radar`                                  |     8 | `common/technologies/ENG_air.txt:1772`                           |
| `technology` | `dependencies.smelting_techniques`                                |     8 | `common/technologies/armor_techs_ENG.txt:262`                    |
| `technology` | `dependencies.steel_industry_ii`                                  |     8 | `common/technologies/armor_techs_ENG.txt:352`                    |
| `technology` | `dependencies.tech_Headquarters2`                                 |     8 | `common/technologies/support.txt:320`                            |
| `technology` | `dependencies.tech_Headquarters3`                                 |     8 | `common/technologies/support.txt:378`                            |
| `technology` | `guards_infantry_assault`                                         |     8 | `common/technologies/_hidden.txt:31`                             |
| `technology` | `gurkha`                                                          |     8 | `common/technologies/_hidden.txt:140`                            |
| `technology` | `heavy_cruiser`                                                   |     8 | `common/technologies/MTG_naval_techs.txt:1175`                   |
| `technology` | `infantry_assault`                                                |     8 | `common/technologies/_hidden.txt:11`                             |
| `technology` | `irregulars_unit`                                                 |     8 | `common/technologies/_hidden.txt:21`                             |
| `technology` | `max_planning`                                                    |     8 | `common/technologies/_hidden.txt:2478`                           |
| `technology` | `militia`                                                         |     8 | `common/technologies/_hidden.txt:871`                            |
| `technology` | `naval_night_attack`                                              |     8 | `common/technologies/naval_doctrine.txt:1027`                    |
| `technology` | `no_supply_grace`                                                 |     8 | `common/technologies/_hidden.txt:2490`                           |
| `technology` | `production_speed_arms_factory_factor`                            |     8 | `common/technologies/industry.txt:381`                           |
| `technology` | `recon`                                                           |     8 | `common/technologies/_hidden.txt:1103`                           |
| `technology` | `recon_cav`                                                       |     8 | `common/technologies/_hidden.txt:1108`                           |
| `technology` | `resources_factor`                                                |     8 | `common/technologies/_hidden.txt:1226`                           |
| `technology` | `show_effect_as_desc`                                             |     8 | `common/technologies/civillian.txt:4765`                         |
| `technology` | `ss_infantry`                                                     |     8 | `common/technologies/_hidden.txt:411`                            |
| `technology` | `ss_light_infantry`                                               |     8 | `common/technologies/_hidden.txt:421`                            |
| `technology` | `ss_mechanized`                                                   |     8 | `common/technologies/_hidden.txt:510`                            |
| `technology` | `ss_paratrooper`                                                  |     8 | `common/technologies/_hidden.txt:579`                            |
| `technology` | `tank_production_capacity`                                        |     8 | `common/technologies/_hidden.txt:1219`                           |
| `character`  | `gender`                                                          |     7 | `common/characters/BHU.txt:201`                                  |
| `character`  | `instance.advisor.visible`                                        |     7 | `common/characters/SWI.txt:206`                                  |
| `technology` | `XOR`                                                             |     7 | `common/technologies/air_doctrine.txt:453`                       |
| `technology` | `category_all_surface_ship`                                       |     7 | `common/technologies/naval_doctrine.txt:3455`                    |
| `technology` | `category_mobile`                                                 |     7 | `common/technologies/_hidden.txt:1253`                           |
| `technology` | `category_tank_recon`                                             |     7 | `common/technologies/_hidden.txt:1128`                           |
| `technology` | `dependencies.antiair2`                                           |     7 | `common/technologies/MTG_naval_techs.txt:5041`                   |
| `technology` | `dependencies.antitank1`                                          |     7 | `common/technologies/TRM_armour_FRA.txt:1462`                    |
| `technology` | `dependencies.armor_industry2`                                    |     7 | `common/technologies/armor_techs_ENG.txt:353`                    |
| `technology` | `dependencies.artillery2`                                         |     7 | `common/technologies/TRM_armour_GER.txt:3268`                    |
| `technology` | `dependencies.chemical_industry_ii`                               |     7 | `common/technologies/TRM_armour_ENG.txt:3568`                    |
| `technology` | `dependencies.improved_centimetric_radar`                         |     7 | `common/technologies/ENG_air.txt:1812`                           |
| `technology` | `engine_production_capacity`                                      |     7 | `common/technologies/_hidden.txt:1221`                           |
| `technology` | `experience_loss_factor`                                          |     7 | `common/technologies/_hidden.txt:2420`                           |
| `technology` | `food_need_civilian`                                              |     7 | `common/technologies/civillian.txt:929`                          |
| `technology` | `fuel_energy_cost`                                                |     7 | `common/technologies/civillian.txt:4528`                         |
| `technology` | `guards_motorized`                                                |     7 | `common/technologies/_hidden.txt:111`                            |
| `technology` | `light_cruiser`                                                   |     7 | `common/technologies/MTG_naval_techs.txt:1172`                   |
| `technology` | `max_air_experience`                                              |     7 | `common/technologies/electronic_mechanical_engineering.txt:3482` |
| `technology` | `max_command_power_mult`                                          |     7 | `common/technologies/land_doctrine.txt:4994`                     |
| `technology` | `max_navy_experience`                                             |     7 | `common/technologies/land_doctrine.txt:4855`                     |
| `technology` | `motorized`                                                       |     7 | `common/technologies/_hidden.txt:60`                             |
| `technology` | `navy_submarine_attack_factor`                                    |     7 | `common/technologies/naval_doctrine.txt:2161`                    |
| `technology` | `production_speed_synthetic_rubber_refinery_factor`               |     7 | `common/technologies/civillian.txt:1711`                         |
| `technology` | `repair_speed_factor`                                             |     7 | `common/technologies/industry.txt:2865`                          |
| `technology` | `semi_motorized`                                                  |     7 | `common/technologies/_hidden.txt:55`                             |
| `technology` | `ss_mechanized_assault`                                           |     7 | `common/technologies/_hidden.txt:525`                            |
| `technology` | `storage_output_factor`                                           |     7 | `common/technologies/_hidden.txt:1227`                           |
| `technology` | `supply_node_range`                                               |     7 | `common/technologies/industry.txt:262`                           |
| `technology` | `air_ace_generation_chance_factor`                                |     6 | `common/technologies/_hidden.txt:1230`                           |
| `technology` | `category_special_forces`                                         |     6 | `common/technologies/land_doctrine.txt:3015`                     |
| `technology` | `civilian_fuel_use_factor`                                        |     6 | `common/technologies/civillian.txt:3579`                         |
| `technology` | `dependencies.antitank4`                                          |     6 | `common/technologies/TRM_armour_ENG.txt:2842`                    |
| `technology` | `dependencies.improved_antitank`                                  |     6 | `common/technologies/TRM_armour_ENG.txt:2747`                    |
| `technology` | `dependencies.interwar_antitank`                                  |     6 | `common/technologies/TRM_armour_ENG.txt:2699`                    |
| `technology` | `dependencies.radio_detection`                                    |     6 | `common/technologies/electronic_mechanical_engineering.txt:1622` |
| `technology` | `dependencies.submerged_arc_weld`                                 |     6 | `common/technologies/armor_techs_ENG.txt:199`                    |
| `technology` | `foreign_subversive_activites`                                    |     6 | `common/technologies/electronic_mechanical_engineering.txt:1577` |
| `technology` | `guards_motorized_assault`                                        |     6 | `common/technologies/_hidden.txt:121`                            |
| `technology` | `land_night_attack`                                               |     6 | `common/technologies/_hidden.txt:2488`                           |
| `technology` | `local_factory_sabotage`                                          |     6 | `common/technologies/electronic_mechanical_engineering.txt:1576` |
| `technology` | `monthly_population`                                              |     6 | `common/technologies/civillian.txt:288`                          |
| `technology` | `motorized_assault`                                               |     6 | `common/technologies/_hidden.txt:75`                             |
| `technology` | `naval_retreat_chance`                                            |     6 | `common/technologies/naval_doctrine.txt:3002`                    |
| `technology` | `navy_submarine_defence_factor`                                   |     6 | `common/technologies/naval_doctrine.txt:2162`                    |
| `technology` | `night_spotting_chance`                                           |     6 | `common/technologies/naval_doctrine.txt:1026`                    |
| `technology` | `production_speed_buildings_factor`                               |     6 | `common/technologies/civillian.txt:1478`                         |
| `technology` | `production_speed_radar_station_factor`                           |     6 | `common/technologies/civillian.txt:1479`                         |
| `technology` | `semi_motorized_assault`                                          |     6 | `common/technologies/_hidden.txt:70`                             |
| `technology` | `special_project_speed_factor`                                    |     6 | `common/technologies/electronic_mechanical_engineering.txt:1985` |
| `technology` | `ss_mountaineers`                                                 |     6 | `common/technologies/_hidden.txt:574`                            |
| `state`      | `history.add_state_modifier`                                      |     5 | `history/states/219-Moscow Area.txt:30`                          |
| `state`      | `history.force_enable_resistance`                                 |     5 | `history/states/714-Heilungkiang.txt:25`                         |
| `state`      | `history.start_resistance`                                        |     5 | `history/states/714-Heilungkiang.txt:26`                         |
| `technology` | `air_nav_efficiency`                                              |     5 | `common/technologies/_hidden.txt:2210`                           |
| `technology` | `air_superiority_detect_factor`                                   |     5 | `common/technologies/_hidden.txt:1234`                           |
| `technology` | `aluminium_energy_cost`                                           |     5 | `common/technologies/_hidden.txt:1225`                           |
| `technology` | `category_all_engineer`                                           |     5 | `common/technologies/support.txt:227`                            |
| `technology` | `category_all_tank_destroyer`                                     |     5 | `common/technologies/artillery.txt:2601`                         |
| `technology` | `category_amphibious_mechanized`                                  |     5 | `common/technologies/infantry.txt:1398`                          |
| `technology` | `category_fighter`                                                |     5 | `common/technologies/_hidden.txt:2165`                           |
| `technology` | `category_front_line`                                             |     5 | `common/technologies/land_doctrine.txt:731`                      |
| `technology` | `category_heavy_fighter`                                          |     5 | `common/technologies/_hidden.txt:2168`                           |
| `technology` | `dependencies.HVantiair2`                                         |     5 | `common/technologies/TRM_armour_ENG.txt:2922`                    |
| `technology` | `dependencies.HVantitank3`                                        |     5 | `common/technologies/TRM_armour_ENG.txt:3064`                    |
| `technology` | `dependencies.antitank2`                                          |     5 | `common/technologies/TRM_armour_ENG.txt:2790`                    |
| `technology` | `dependencies.artillery4`                                         |     5 | `common/technologies/TRM_armour_ENG.txt:2983`                    |
| `technology` | `dependencies.hmg`                                                |     5 | `common/technologies/TRM_armour_ITA.txt:1027`                    |
| `technology` | `dependencies.nrm_carrier_development`                            |     5 | `common/technologies/MTG_naval.txt:3534`                         |
| `technology` | `destroyer`                                                       |     5 | `common/technologies/MTG_naval_techs.txt:1169`                   |
| `technology` | `destroyer_escort`                                                |     5 | `common/technologies/MTG_naval_techs.txt:1166`                   |
| `technology` | `energy_consumption_factor`                                       |     5 | `common/technologies/civillian.txt:3274`                         |
| `technology` | `fuel_gain_factor`                                                |     5 | `common/technologies/civillian.txt:4003`                         |
| `technology` | `mines_planting_by_fleets_factor`                                 |     5 | `common/technologies/MTG_naval_techs.txt:6845`                   |
| `technology` | `patrol_submarine`                                                |     5 | `common/technologies/MTG_naval_techs.txt:1084`                   |
| `technology` | `power_plant_resilience`                                          |     5 | `common/technologies/industry.txt:2599`                          |
| `technology` | `production_lack_of_resource_penalty_factor`                      |     5 | `common/technologies/civillian.txt:1523`                         |
| `technology` | `production_speed_air_base_factor`                                |     5 | `common/technologies/industry.txt:2819`                          |
| `technology` | `production_speed_anti_air_building_factor`                       |     5 | `common/technologies/industry.txt:2598`                          |
| `technology` | `production_speed_bunker_factor`                                  |     5 | `common/technologies/industry.txt:2646`                          |
| `technology` | `production_speed_coastal_bunker_factor`                          |     5 | `common/technologies/industry.txt:2647`                          |
| `technology` | `production_speed_farm_factor`                                    |     5 | `common/technologies/civillian.txt:817`                          |
| `technology` | `production_speed_naval_base_factor`                              |     5 | `common/technologies/industry.txt:2688`                          |
| `technology` | `recon_ac`                                                        |     5 | `common/technologies/_hidden.txt:1123`                           |
| `technology` | `ss_infantry_assault`                                             |     5 | `common/technologies/_hidden.txt:416`                            |
| `technology` | `ss_semi_motorized`                                               |     5 | `common/technologies/_hidden.txt:106`                            |
| `technology` | `static_anti_air_damage_factor`                                   |     5 | `common/technologies/artillery.txt:232`                          |
| `technology` | `static_anti_air_hit_chance_factor`                               |     5 | `common/technologies/electronic_mechanical_engineering.txt:1384` |
| `technology` | `torpedo_boat`                                                    |     5 | `common/technologies/MTG_naval_techs.txt:1163`                   |
| `technology` | `transport_capacity`                                              |     5 | `common/technologies/MTG_naval.txt:4255`                         |
| `character`  | `corps_commander.visible`                                         |     4 | `common/characters/MAN.txt:118`                                  |
| `equipment`  | `modifier_stat`                                                   |     4 | `common/units/equipment/repair_ships.txt:58`                     |
| `technology` | `air_accidents_factor`                                            |     4 | `common/technologies/electronic_mechanical_engineering.txt:1133` |
| `technology` | `air_escort_efficiency`                                           |     4 | `common/technologies/_hidden.txt:2207`                           |
| `technology` | `air_interception_detect_factor`                                  |     4 | `common/technologies/air_doctrine.txt:122`                       |
| `technology` | `alloy_steel_output`                                              |     4 | `common/technologies/civillian.txt:2833`                         |
| `technology` | `aluminium_conversion_output`                                     |     4 | `common/technologies/_hidden.txt:1224`                           |
| `technology` | `armored_car`                                                     |     4 | `common/technologies/land_doctrine.txt:498`                      |
| `technology` | `armored_carrier`                                                 |     4 | `common/technologies/MTG_naval_techs.txt:5486`                   |
| `technology` | `army_fuel_capacity_factor`                                       |     4 | `common/technologies/civillian.txt:3778`                         |
| `technology` | `category_all_logistics`                                          |     4 | `common/technologies/_hidden.txt:2157`                           |
| `technology` | `coastal_submarine`                                               |     4 | `common/technologies/MTG_naval_techs.txt:1081`                   |
| `technology` | `critical_receive_chance`                                         |     4 | `common/technologies/MTG_naval_techs.txt:6261`                   |
| `technology` | `dependencies.HVantiair3`                                         |     4 | `common/technologies/TRM_armour_JAP.txt:1651`                    |
| `technology` | `dependencies.HVantiair4`                                         |     4 | `common/technologies/TRM_armour_ITA.txt:1428`                    |
| `technology` | `dependencies.Hvartillery2`                                       |     4 | `common/technologies/TRM_armour_GER.txt:3503`                    |
| `technology` | `dependencies.antiair1`                                           |     4 | `common/technologies/TRM_armour_ENG.txt:3324`                    |
| `technology` | `dependencies.chemical_industry_i`                                |     4 | `common/technologies/armor_techs.txt:605`                        |
| `technology` | `dependencies.infantry_guns1`                                     |     4 | `common/technologies/TRM_armour_GER.txt:3351`                    |
| `technology` | `dependencies.rocket_engines`                                     |     4 | `common/technologies/GER_air.txt:5813`                           |
| `technology` | `dependencies.tech_ju_88_a4_bomber_equipment_1`                   |     4 | `common/technologies/GER_air.txt:2789`                           |
| `technology` | `dependencies.tech_liaison_cars`                                  |     4 | `common/technologies/artillery.txt:2280`                         |
| `technology` | `dependencies.tech_mosquito_fsb_equipment_2`                      |     4 | `common/technologies/ENG_air.txt:1424`                           |
| `technology` | `dependencies.tech_trm_cavalry_tank_chassis_usa_m1_1`             |     4 | `common/technologies/TRM_armour_USA.txt:373`                     |
| `technology` | `energy_fuel_fraction_cap`                                        |     4 | `common/technologies/_hidden.txt:1228`                           |
| `technology` | `escort`                                                          |     4 | `common/technologies/MTG_naval_techs.txt:1160`                   |
| `technology` | `fighter_sortie_efficiency`                                       |     4 | `common/technologies/naval_doctrine.txt:5369`                    |
| `technology` | `fleet_carrier`                                                   |     4 | `common/technologies/MTG_naval_techs.txt:5482`                   |
| `technology` | `force_use_small_tech_layout`                                     |     4 | `common/technologies/infantry.txt:2974`                          |
| `technology` | `ground_attack_factor`                                            |     4 | `common/technologies/air_doctrine.txt:712`                       |
| `technology` | `industry_repair_factor`                                          |     4 | `common/technologies/industry.txt:641`                           |
| `technology` | `local_supply_in_core_states`                                     |     4 | `common/technologies/civillian.txt:1709`                         |
| `technology` | `local_supply_in_states`                                          |     4 | `common/technologies/civillian.txt:1708`                         |
| `technology` | `lr_submarine`                                                    |     4 | `common/technologies/MTG_naval_techs.txt:1087`                   |
| `technology` | `max_fuel_factor`                                                 |     4 | `common/technologies/civillian.txt:3790`                         |
| `technology` | `motorcycle_infantry`                                             |     4 | `common/technologies/_hidden.txt:50`                             |
| `technology` | `naval_critical_effect_factor`                                    |     4 | `common/technologies/MTG_naval_techs.txt:6262`                   |
| `technology` | `naval_enemy_fleet_size_ratio_penalty_factor`                     |     4 | `common/technologies/naval_doctrine.txt:4437`                    |
| `technology` | `naval_invasion_division_cap`                                     |     4 | `common/technologies/land_doctrine.txt:7349`                     |
| `technology` | `naval_invasion_penalty`                                          |     4 | `common/technologies/land_doctrine.txt:7348`                     |
| `technology` | `partisan`                                                        |     4 | `common/technologies/land_doctrine.txt:3191`                     |
| `technology` | `production_speed_nuclear_reactor_factor`                         |     4 | `common/technologies/civillian.txt:1613`                         |
| `technology` | `production_speed_nuclear_reactor_heavy_water_factor`             |     4 | `common/technologies/civillian.txt:1614`                         |
| `technology` | `production_speed_steel_refinery_factor`                          |     4 | `common/technologies/civillian.txt:2585`                         |
| `technology` | `resistance_damage_to_garrison_on_our_occupied_states`            |     4 | `common/technologies/land_doctrine.txt:3069`                     |
| `technology` | `sickness_chance`                                                 |     4 | `common/technologies/civillian.txt:151`                          |
| `technology` | `ss_motorized`                                                    |     4 | `common/technologies/_hidden.txt:505`                            |
| `technology` | `super_carrier`                                                   |     4 | `common/technologies/MTG_naval_techs.txt:5478`                   |
| `character`  | `scientist.visible`                                               |     3 | `common/characters/BEL.txt:1090`                                 |
| `module`     | `forbid_equipment_type_exact_match_for_category`                  |     3 | `common/units/equipment/modules/00_tank_modules.txt:269`         |
| `technology` | `DIV_HQ`                                                          |     3 | `common/technologies/_hidden.txt:1073`                           |
| `technology` | `DIV_HQ_airborne`                                                 |     3 | `common/technologies/_hidden.txt:1078`                           |
| `technology` | `DIV_HQ_car`                                                      |     3 | `common/technologies/_hidden.txt:1083`                           |
| `technology` | `DIV_HQ_mech`                                                     |     3 | `common/technologies/_hidden.txt:1088`                           |
| `technology` | `air_strategic_bomber_night_penalty`                              |     3 | `common/technologies/_hidden.txt:2206`                           |
| `technology` | `airforce_intel_factor`                                           |     3 | `common/technologies/electronic_mechanical_engineering.txt:1699` |
| `technology` | `army_intel_factor`                                               |     3 | `common/technologies/electronic_mechanical_engineering.txt:1697` |
| `technology` | `category_all_light_anti_air`                                     |     3 | `common/technologies/artillery.txt:404`                          |
| `technology` | `category_all_light_anti_tank`                                    |     3 | `common/technologies/artillery.txt:2597`                         |
| `technology` | `category_all_light_artillery`                                    |     3 | `common/technologies/_hidden.txt:1262`                           |
| `technology` | `category_all_maintenance`                                        |     3 | `common/technologies/support.txt:1567`                           |
| `technology` | `category_all_medium_artillery`                                   |     3 | `common/technologies/_hidden.txt:1304`                           |
| `technology` | `category_all_rocket`                                             |     3 | `common/technologies/_hidden.txt:1472`                           |
| `technology` | `category_all_signal`                                             |     3 | `common/technologies/support.txt:2245`                           |
| `technology` | `category_all_tank_anti_air`                                      |     3 | `common/technologies/artillery.txt:410`                          |
| `technology` | `category_heavy_logistics`                                        |     3 | `common/technologies/support.txt:2010`                           |
| `technology` | `category_line_artillery`                                         |     3 | `common/technologies/land_doctrine.txt:2222`                     |
| `technology` | `category_mobile_recon`                                           |     3 | `common/technologies/support.txt:1010`                           |
| `technology` | `category_semimot`                                                |     3 | `common/technologies/land_doctrine.txt:369`                      |
| `technology` | `combat_engineer`                                                 |     3 | `common/technologies/_hidden.txt:2253`                           |
| `technology` | `command_power_gain`                                              |     3 | `common/technologies/land_doctrine.txt:4861`                     |
| `technology` | `commando`                                                        |     3 | `common/technologies/_hidden.txt:569`                            |
| `technology` | `conversion_bauxite_input`                                        |     3 | `common/technologies/civillian.txt:2302`                         |
| `technology` | `conversion_coal_input`                                           |     3 | `common/technologies/civillian.txt:2832`                         |
| `technology` | `crypto_strength`                                                 |     3 | `common/technologies/electronic_mechanical_engineering.txt:2583` |
| `technology` | `decryption`                                                      |     3 | `common/technologies/electronic_mechanical_engineering.txt:2427` |
| `technology` | `decryption_power`                                                |     3 | `common/technologies/electronic_mechanical_engineering.txt:2738` |
| `technology` | `decryption_power_factor`                                         |     3 | `common/technologies/electronic_mechanical_engineering.txt:2739` |
| `technology` | `dependencies.HVantitank1`                                        |     3 | `common/technologies/TRM_armour_ENG.txt:2984`                    |
| `technology` | `dependencies.WW1_air_ground`                                     |     3 | `common/technologies/air_doctrine.txt:19`                        |
| `technology` | `dependencies.WW1_air_naval`                                      |     3 | `common/technologies/air_doctrine.txt:18`                        |
| `technology` | `dependencies.antiair3`                                           |     3 | `common/technologies/TRM_armour_ENG.txt:3373`                    |
| `technology` | `dependencies.antiair5`                                           |     3 | `common/technologies/MTG_naval_techs.txt:5130`                   |
| `technology` | `dependencies.antitank5`                                          |     3 | `common/technologies/TRM_armour_FRA.txt:1628`                    |
| `technology` | `dependencies.artillery5`                                         |     3 | `common/technologies/TRM_armour_ITA.txt:1504`                    |
| `technology` | `dependencies.basic_torpedo`                                      |     3 | `common/technologies/MTG_naval_techs.txt:1406`                   |
| `technology` | `dependencies.computing_machine`                                  |     3 | `common/technologies/civillian.txt:569`                          |
| `technology` | `dependencies.hmg_2`                                              |     3 | `common/technologies/TRM_armour_ENG.txt:2622`                    |
| `technology` | `dependencies.hmg_3`                                              |     3 | `common/technologies/TRM_armour_ENG.txt:2660`                    |
| `technology` | `dependencies.improved_infantry_weapons_2`                        |     3 | `common/technologies/infantry.txt:981`                           |
| `technology` | `dependencies.infantry_weapons2`                                  |     3 | `common/technologies/infantry.txt:924`                           |
| `technology` | `dependencies.interwar_antiair`                                   |     3 | `common/technologies/TRM_armour_ITA.txt:1146`                    |
| `technology` | `dependencies.nrm_fleet_coordination`                             |     3 | `common/technologies/naval_doctrine.txt:3021`                    |
| `technology` | `dependencies.nrm_independent_cruiser_operation`                  |     3 | `common/technologies/naval_doctrine.txt:3022`                    |
| `technology` | `dependencies.port_infra2`                                        |     3 | `common/technologies/industry.txt:4108`                          |
| `technology` | `dependencies.radio_technology`                                   |     3 | `common/technologies/industry.txt:4337`                          |
| `technology` | `dependencies.subtech_recon_mot_1`                                |     3 | `common/technologies/infantry.txt:3682`                          |
| `technology` | `dependencies.tech_ju_88_s_bomber_equipment_1`                    |     3 | `common/technologies/GER_air.txt:3027`                           |
| `technology` | `dependencies.tech_sm79_light_bomber_equipment_1`                 |     3 | `common/technologies/ITA_air.txt:3045`                           |
| `technology` | `encryption`                                                      |     3 | `common/technologies/electronic_mechanical_engineering.txt:2272` |
| `technology` | `energy_production_factor`                                        |     3 | `common/technologies/civillian.txt:3067`                         |
| `technology` | `experience_gain_factor`                                          |     3 | `common/technologies/land_doctrine.txt:4857`                     |
| `technology` | `extra_paratrooper_supply_grace`                                  |     3 | `common/technologies/industry.txt:4055`                          |
| `technology` | `field_hospital`                                                  |     3 | `common/technologies/support.txt:1784`                           |
| `technology` | `field_hospital_cav`                                              |     3 | `common/technologies/support.txt:1780`                           |
| `technology` | `food_decay_factor`                                               |     3 | `common/technologies/civillian.txt:1248`                         |
| `technology` | `intelligence_agency_defense`                                     |     3 | `common/technologies/electronic_mechanical_engineering.txt:1700` |
| `technology` | `invasion_preparation`                                            |     3 | `common/technologies/MTG_naval.txt:4357`                         |
| `technology` | `max_shipyard`                                                    |     3 | `common/technologies/industry.txt:1922`                          |
| `technology` | `max_subyard`                                                     |     3 | `common/technologies/industry.txt:1959`                          |
| `technology` | `military_police`                                                 |     3 | `common/technologies/support.txt:1325`                           |
| `technology` | `naval_coordination`                                              |     3 | `common/technologies/naval_doctrine.txt:3462`                    |
| `technology` | `naval_general_support_value_factor`                              |     3 | `common/technologies/special_projects_tech.txt:188`              |
| `technology` | `naval_invasion_plan_cap`                                         |     3 | `common/technologies/MTG_naval.txt:4307`                         |
| `technology` | `naval_mines_damage_factor`                                       |     3 | `common/technologies/MTG_naval_techs.txt:6844`                   |
| `technology` | `naval_mines_effect_reduction`                                    |     3 | `common/technologies/MTG_naval_techs.txt:6899`                   |
| `technology` | `naval_repair_support_value_factor`                               |     3 | `common/technologies/special_projects_tech.txt:217`              |
| `technology` | `navy_intel_factor`                                               |     3 | `common/technologies/electronic_mechanical_engineering.txt:1698` |
| `technology` | `oil_resource_factor`                                             |     3 | `common/technologies/civillian.txt:4275`                         |
| `technology` | `production_speed_aluminium_refinery_factor`                      |     3 | `common/technologies/civillian.txt:2303`                         |
| `technology` | `production_speed_power_plant_factor`                             |     3 | `common/technologies/civillian.txt:3068`                         |
| `technology` | `recon_factor_while_entrenched`                                   |     3 | `common/technologies/_hidden.txt:1232`                           |
| `technology` | `recon_mot`                                                       |     3 | `common/technologies/_hidden.txt:1113`                           |
| `technology` | `resistance_target_on_our_occupied_states`                        |     3 | `common/technologies/land_doctrine.txt:3068`                     |
| `technology` | `rubber_conversion_output`                                        |     3 | `common/technologies/civillian.txt:4895`                         |
| `technology` | `shore_bombardment_bonus`                                         |     3 | `common/technologies/land_doctrine.txt:7237`                     |
| `technology` | `special_forces_training_time_factor`                             |     3 | `common/technologies/land_doctrine.txt:6814`                     |
| `technology` | `ss_motorized_assault`                                            |     3 | `common/technologies/_hidden.txt:520`                            |
| `technology` | `ss_semi_motorized_assault`                                       |     3 | `common/technologies/_hidden.txt:515`                            |
| `technology` | `steel_conversion_output`                                         |     3 | `common/technologies/civillian.txt:2646`                         |
| `technology` | `tac_bomber`                                                      |     3 | `common/technologies/air_doctrine.txt:73`                        |
| `technology` | `training_time_army_factor`                                       |     3 | `common/technologies/industry.txt:3032`                          |
| `technology` | `underway_replenishment_convoy_cost`                              |     3 | `common/technologies/naval_doctrine.txt:6463`                    |
| `technology` | `underway_replenishment_range`                                    |     3 | `common/technologies/naval_doctrine.txt:6462`                    |
| `character`  | `navy_leader.visible`                                             |     2 | `common/characters/SOV.txt:1165`                                 |
| `technology` | `air_detection`                                                   |     2 | `common/technologies/_hidden.txt:1235`                           |
| `technology` | `air_home_defence_factor`                                         |     2 | `common/technologies/ww1_land_doctrine.txt:2973`                 |
| `technology` | `air_mission_efficiency`                                          |     2 | `common/technologies/_hidden.txt:1231`                           |
| `technology` | `air_strategic_bomber_defence_factor`                             |     2 | `common/technologies/air_doctrine.txt:655`                       |
| `technology` | `air_wing_xp_loss_when_killed_factor`                             |     2 | `common/technologies/air_doctrine.txt:1019`                      |
| `technology` | `amphibious_invasion_defence`                                     |     2 | `common/technologies/land_doctrine.txt:3750`                     |
| `technology` | `anti_air_heavy`                                                  |     2 | `common/technologies/artillery.txt:883`                          |
| `technology` | `anti_air_heavy_mot`                                              |     2 | `common/technologies/artillery.txt:890`                          |
| `technology` | `army_core_defence_factor`                                        |     2 | `common/technologies/land_doctrine.txt:3567`                     |
| `technology` | `army_morale_factor`                                              |     2 | `common/technologies/civillian.txt:249`                          |
| `technology` | `army_retreat_speed_factor`                                       |     2 | `common/technologies/land_doctrine.txt:4193`                     |
| `technology` | `army_strength_factor`                                            |     2 | `common/technologies/land_doctrine.txt:4551`                     |
| `technology` | `cas_damage_reduction`                                            |     2 | `common/technologies/land_doctrine.txt:3848`                     |
| `technology` | `category_all_heavy_anti_tank`                                    |     2 | `common/technologies/artillery.txt:3009`                         |
| `technology` | `category_all_heavy_artillery`                                    |     2 | `common/technologies/artillery.txt:1997`                         |
| `technology` | `category_assault_infantry`                                       |     2 | `common/technologies/land_doctrine.txt:1569`                     |
| `technology` | `category_cas`                                                    |     2 | `common/technologies/_hidden.txt:2171`                           |
| `technology` | `category_jet`                                                    |     2 | `common/technologies/electronic_mechanical_engineering.txt:3667` |
| `technology` | `category_nav_bomber`                                             |     2 | `common/technologies/MTG_naval_techs.txt:6999`                   |
| `technology` | `category_strat_bomber`                                           |     2 | `common/technologies/air_doctrine.txt:657`                       |
| `technology` | `category_support_battalions`                                     |     2 | `common/technologies/land_doctrine.txt:784`                      |
| `technology` | `category_tac_bomber`                                             |     2 | `common/technologies/MTG_naval_techs.txt:7002`                   |
| `technology` | `command_power_gain_mult`                                         |     2 | `common/technologies/land_doctrine.txt:5123`                     |
| `technology` | `compliance_growth_on_our_occupied_states`                        |     2 | `common/technologies/land_doctrine.txt:3202`                     |
| `technology` | `conversion_iron_input`                                           |     2 | `common/technologies/civillian.txt:2535`                         |
| `technology` | `dependencies.HVantitank4`                                        |     2 | `common/technologies/TRM_armour_GER.txt:2988`                    |
| `technology` | `dependencies.Hvartillery5`                                       |     2 | `common/technologies/TRM_armour_SOV.txt:2640`                    |
| `technology` | `dependencies.advanced_avionics`                                  |     2 | `common/technologies/electronic_mechanical_engineering.txt:3051` |
| `technology` | `dependencies.antiair4`                                           |     2 | `common/technologies/TRM_armour_ITA.txt:1620`                    |
| `technology` | `dependencies.antitank3`                                          |     2 | `common/technologies/TRM_armour_FRA.txt:1585`                    |
| `technology` | `dependencies.artillery_observers`                                |     2 | `common/technologies/land_doctrine.txt:778`                      |
| `technology` | `dependencies.chemical_industry_iii`                              |     2 | `common/technologies/civillian.txt:4368`                         |
| `technology` | `dependencies.electronic_mechanical_engineering`                  |     2 | `common/technologies/MTG_naval_techs.txt:1101`                   |
| `technology` | `dependencies.improved_computing_machine`                         |     2 | `common/technologies/armor_techs.txt:721`                        |
| `technology` | `dependencies.infantry_at`                                        |     2 | `common/technologies/TRM_armour_GER.txt:2483`                    |
| `technology` | `dependencies.infantry_guns`                                      |     2 | `common/technologies/TRM_armour_GER.txt:2729`                    |
| `technology` | `dependencies.mechanised_infantry`                                |     2 | `common/technologies/support.txt:916`                            |
| `technology` | `dependencies.medartillery5`                                      |     2 | `common/technologies/TRM_armour_GER.txt:3390`                    |
| `technology` | `dependencies.nrm_carrier_independent`                            |     2 | `common/technologies/naval_doctrine.txt:5562`                    |
| `technology` | `dependencies.nrm_carrier_integrated`                             |     2 | `common/technologies/naval_doctrine.txt:5726`                    |
| `technology` | `dependencies.nrm_destroyer_torpedo_tactics`                      |     2 | `common/technologies/naval_doctrine.txt:3024`                    |
| `technology` | `dependencies.nrm_independent_destroyer_operation`                |     2 | `common/technologies/MTG_naval.txt:1119`                         |
| `technology` | `dependencies.nuclear_reactor`                                    |     2 | `common/technologies/electronic_mechanical_engineering.txt:4325` |
| `technology` | `dependencies.semi_motorised_infantry`                            |     2 | `common/technologies/support.txt:1517`                           |
| `technology` | `dependencies.tech_avro_lancaster_equipment_1`                    |     2 | `common/technologies/ENG_air.txt:3697`                           |
| `technology` | `dependencies.tech_bristol_blenheim_equipment_2`                  |     2 | `common/technologies/ENG_air.txt:1728`                           |
| `technology` | `dependencies.tech_ca310_light_bomber_equipment_1`                |     2 | `common/technologies/ITA_air.txt:2029`                           |
| `technology` | `dependencies.tech_consolidated_b24_equipment_1`                  |     2 | `common/technologies/USA_air.txt:3435`                           |
| `technology` | `dependencies.tech_do_17_bomber_equipment_2`                      |     2 | `common/technologies/GER_air.txt:2883`                           |
| `technology` | `dependencies.tech_do_217_bomber_equipment_2`                     |     2 | `common/technologies/GER_air.txt:4239`                           |
| `technology` | `dependencies.tech_douglas_a20_equipment_1`                       |     2 | `common/technologies/USA_air.txt:1441`                           |
| `technology` | `dependencies.tech_hawker_hurricane_equipment_2`                  |     2 | `common/technologies/ENG_air.txt:1244`                           |
| `technology` | `dependencies.tech_ju_188_bomber_equipment_1`                     |     2 | `common/technologies/GER_air.txt:4516`                           |
| `technology` | `dependencies.tech_ju_87_equipment_4`                             |     2 | `common/technologies/GER_air.txt:5469`                           |
| `technology` | `dependencies.tech_late_spitfire_equipment_1`                     |     2 | `common/technologies/ENG_air.txt:1954`                           |
| `technology` | `dependencies.tech_ln_401_CAS_equipment_1`                        |     2 | `common/technologies/FRA_air.txt:1383`                           |
| `technology` | `dependencies.tech_me_109_late_fighter_equipment_3`               |     2 | `common/technologies/GER_air.txt:1812`                           |
| `technology` | `dependencies.tech_mosquito_fsb_equipment_1`                      |     2 | `common/technologies/ENG_air.txt:1773`                           |
| `technology` | `dependencies.tech_motorkannon`                                   |     2 | `common/technologies/GER_air.txt:628`                            |
| `technology` | `dependencies.tech_p108_heavy_bomber_equipment_1`                 |     2 | `common/technologies/ITA_air.txt:3213`                           |
| `technology` | `dependencies.tech_potez_630_fighter_equipment_1`                 |     2 | `common/technologies/FRA_air.txt:2039`                           |
| `technology` | `dependencies.tech_re2001_multirole_equipment_1`                  |     2 | `common/technologies/ITA_air.txt:1252`                           |
| `technology` | `dependencies.tech_re2002_multirole_equipment_1`                  |     2 | `common/technologies/ITA_air.txt:1095`                           |
| `technology` | `dependencies.tech_sm75_transport_plane_equipment_1`              |     2 | `common/technologies/ITA_air.txt:2895`                           |
| `technology` | `dependencies.tech_trm_cavalry_tank_chassis_sov_bt7_1`            |     2 | `common/technologies/TRM_armour_SOV.txt:469`                     |
| `technology` | `dependencies.tech_trm_czech_design`                              |     2 | `common/technologies/TRM_armour_GER.txt:734`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_usa_m5_1`               |     2 | `common/technologies/TRM_armour_USA.txt:862`                     |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_ger_panzer3_3`         |     2 | `common/technologies/armor_techs_GER.txt:113`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_ger_panzer3_4`         |     2 | `common/technologies/TRM_armour_GER.txt:1896`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_ger_panzer4_3`         |     2 | `common/technologies/TRM_armour_GER.txt:1897`                    |
| `technology` | `dependencies.tech_trm_weapon_c_eng_76_17pdr`                     |     2 | `common/technologies/TRM_armour_ENG.txt:2183`                    |
| `technology` | `dependencies.tech_trm_weapon_c_usa_90_m3`                        |     2 | `common/technologies/TRM_armour_USA.txt:1328`                    |
| `technology` | `dependencies.tech_tu_2_bomber_equipment_2`                       |     2 | `common/technologies/SOV_air.txt:2212`                           |
| `technology` | `dependencies.tech_vickers_wellington_bomber_equipment_3`         |     2 | `common/technologies/ENG_air.txt:3528`                           |
| `technology` | `dependencies.tech_yak_3_equipment_1`                             |     2 | `common/technologies/SOV_air.txt:1441`                           |
| `technology` | `enemy_army_bonus_air_superiority_factor`                         |     2 | `common/technologies/land_doctrine.txt:3204`                     |
| `technology` | `engineer`                                                        |     2 | `common/technologies/_hidden.txt:2494`                           |
| `technology` | `equipment_capture`                                               |     2 | `common/technologies/land_doctrine.txt:2999`                     |
| `technology` | `equipment_conversion_speed`                                      |     2 | `common/technologies/industry.txt:683`                           |
| `technology` | `experience_gain_marine_assault_combat_factor`                    |     2 | `common/technologies/land_doctrine.txt:5855`                     |
| `technology` | `experience_gain_marine_combat_factor`                            |     2 | `common/technologies/land_doctrine.txt:5854`                     |
| `technology` | `experience_gain_mountaineers_combat_factor`                      |     2 | `common/technologies/land_doctrine.txt:5856`                     |
| `technology` | `experience_gain_paratrooper_combat_factor`                       |     2 | `common/technologies/land_doctrine.txt:5857`                     |
| `technology` | `garrison`                                                        |     2 | `common/technologies/_hidden.txt:856`                            |
| `technology` | `light_carrier`                                                   |     2 | `common/technologies/MTG_naval_techs.txt:5490`                   |
| `technology` | `luftwaffe_infantry`                                              |     2 | `common/technologies/_hidden.txt:881`                            |
| `technology` | `max_experience`                                                  |     2 | `common/technologies/land_doctrine.txt:4854`                     |
| `technology` | `mines_sweeping_by_fleets_factor`                                 |     2 | `common/technologies/naval_doctrine.txt:4882`                    |
| `technology` | `minimum_training_level`                                          |     2 | `common/technologies/land_doctrine.txt:1270`                     |
| `technology` | `naval_general_support_factor`                                    |     2 | `common/technologies/special_projects_tech.txt:189`              |
| `technology` | `naval_repair_support_factor`                                     |     2 | `common/technologies/special_projects_tech.txt:218`              |
| `technology` | `naval_strike_attack_factor`                                      |     2 | `common/technologies/_hidden.txt:1237`                           |
| `technology` | `naval_torpedo_hit_chance_factor`                                 |     2 | `common/technologies/naval_doctrine.txt:1097`                    |
| `technology` | `out_of_supply_factor`                                            |     2 | `common/technologies/land_doctrine.txt:1661`                     |
| `technology` | `planning_decay_rate_factor`                                      |     2 | `common/technologies/land_doctrine.txt:2418`                     |
| `technology` | `reassignment_duration_factor`                                    |     2 | `common/technologies/industry.txt:4638`                          |
| `technology` | `recon_factor`                                                    |     2 | `common/technologies/_hidden.txt:1233`                           |
| `technology` | `resistance_decay_on_our_occupied_states`                         |     2 | `common/technologies/land_doctrine.txt:3251`                     |
| `technology` | `resistance_growth_on_our_occupied_states`                        |     2 | `common/technologies/land_doctrine.txt:3135`                     |
| `technology` | `screening_without_screens`                                       |     2 | `common/technologies/naval_doctrine.txt:4525`                    |
| `technology` | `special_forces_cap`                                              |     2 | `common/technologies/infantry.txt:1952`                          |
| `technology` | `special_forces_no_supply_grace`                                  |     2 | `common/technologies/land_doctrine.txt:6940`                     |
| `technology` | `ss_garrison`                                                     |     2 | `common/technologies/_hidden.txt:861`                            |
| `technology` | `ss_motorcycle_infantry`                                          |     2 | `common/technologies/_hidden.txt:495`                            |
| `technology` | `training_time_factor`                                            |     2 | `common/technologies/industry.txt:4995`                          |
| `technology` | `trm_amph_tank_chassis_design_cost_factor`                        |     2 | `common/technologies/armor_techs.txt:146`                        |
| `technology` | `trm_cavalry_tank_chassis_design_cost_factor`                     |     2 | `common/technologies/armor_techs.txt:147`                        |
| `technology` | `trm_heavy_tank_chassis_design_cost_factor`                       |     2 | `common/technologies/armor_techs.txt:151`                        |
| `technology` | `trm_infantry_tank_chassis_design_cost_factor`                    |     2 | `common/technologies/armor_techs.txt:150`                        |
| `technology` | `trm_light_tank_chassis_design_cost_factor`                       |     2 | `common/technologies/armor_techs.txt:144`                        |
| `technology` | `trm_medium_advanced_tank_chassis_design_cost_factor`             |     2 | `common/technologies/armor_techs.txt:149`                        |
| `technology` | `trm_medium_tank_chassis_design_cost_factor`                      |     2 | `common/technologies/armor_techs.txt:148`                        |
| `technology` | `trm_para_tank_chassis_design_cost_factor`                        |     2 | `common/technologies/armor_techs.txt:145`                        |
| `technology` | `trm_superheavy_tank_chassis_design_cost_factor`                  |     2 | `common/technologies/armor_techs.txt:152`                        |
| `technology` | `trm_tankette_tank_chassis_design_cost_factor`                    |     2 | `common/technologies/armor_techs.txt:143`                        |
| `technology` | `wounded_chance_factor`                                           |     2 | `common/technologies/civillian.txt:250`                          |
| `character`  | `field_marshal.visible`                                           |     1 | `common/characters/USA.txt:1851`                                 |
| `equipment`  | `can_be_lend_leased`                                              |     1 | `common/units/equipment/floating_harbor.txt:21`                  |
| `equipment`  | `can_be_produced`                                                 |     1 | `common/units/equipment/floating_harbor.txt:25`                  |
| `module`     | `multiply_stats.naval_speed`                                      |     1 | `common/units/equipment/modules/00_ship_modules.txt:2097`        |
| `state`      | `history.add_dynamic_modifier`                                    |     1 | `history/states/28-Alcase.txt:19`                                |
| `technology` | `acclimatization_cold_climate_gain_factor`                        |     1 | `common/technologies/land_doctrine.txt:7181`                     |
| `technology` | `air_fuel_consumption_factor`                                     |     1 | `common/technologies/industry.txt:4762`                          |
| `technology` | `air_night_penalty`                                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:1260` |
| `technology` | `air_weather_penalty`                                             |     1 | `common/technologies/electronic_mechanical_engineering.txt:1244` |
| `technology` | `airborne_artillery_brigade`                                      |     1 | `common/technologies/artillery.txt:1240`                         |
| `technology` | `alloy_steel_input`                                               |     1 | `common/technologies/civillian.txt:2880`                         |
| `technology` | `amph_support`                                                    |     1 | `common/technologies/land_doctrine.txt:7291`                     |
| `technology` | `anti_tank`                                                       |     1 | `common/technologies/_hidden.txt:2247`                           |
| `technology` | `anti_tank_brigade`                                               |     1 | `common/technologies/_hidden.txt:2235`                           |
| `technology` | `anti_tank_brigade_med`                                           |     1 | `common/technologies/_hidden.txt:2241`                           |
| `technology` | `anti_tank_brigade_mot`                                           |     1 | `common/technologies/_hidden.txt:2238`                           |
| `technology` | `anti_tank_brigade_mot_med`                                       |     1 | `common/technologies/_hidden.txt:2244`                           |
| `technology` | `anti_tank_mot`                                                   |     1 | `common/technologies/_hidden.txt:2250`                           |
| `technology` | `army_artillery_defence_factor`                                   |     1 | `common/technologies/land_doctrine.txt:3847`                     |
| `technology` | `army_core_attack_factor`                                         |     1 | `common/technologies/land_doctrine.txt:3566`                     |
| `technology` | `army_morale`                                                     |     1 | `common/technologies/land_doctrine.txt:1969`                     |
| `technology` | `ballistic_missile`                                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:3333` |
| `technology` | `category_all_air`                                                |     1 | `common/technologies/_hidden.txt:2174`                           |
| `technology` | `category_heavy_armor`                                            |     1 | `common/technologies/_hidden.txt:1676`                           |
| `technology` | `category_heavy_tank_artillery`                                   |     1 | `common/technologies/_hidden.txt:1430`                           |
| `technology` | `category_light_armor`                                            |     1 | `common/technologies/_hidden.txt:1538`                           |
| `technology` | `category_light_tank_artillery`                                   |     1 | `common/technologies/_hidden.txt:1346`                           |
| `technology` | `category_medium_armor`                                           |     1 | `common/technologies/_hidden.txt:1607`                           |
| `technology` | `category_medium_tank_artillery`                                  |     1 | `common/technologies/_hidden.txt:1388`                           |
| `technology` | `category_superheavy_armor`                                       |     1 | `common/technologies/_hidden.txt:1745`                           |
| `technology` | `combat_engineer_arm`                                             |     1 | `common/technologies/support.txt:569`                            |
| `technology` | `combat_engineer_mech`                                            |     1 | `common/technologies/support.txt:554`                            |
| `technology` | `combat_engineer_mot`                                             |     1 | `common/technologies/support.txt:539`                            |
| `technology` | `conscription_factor`                                             |     1 | `common/technologies/land_doctrine.txt:3334`                     |
| `technology` | `conscripts`                                                      |     1 | `common/technologies/_hidden.txt:2385`                           |
| `technology` | `consumer_goods_expected_value`                                   |     1 | `common/technologies/civillian.txt:1657`                         |
| `technology` | `cv_cas`                                                          |     1 | `common/technologies/air_doctrine.txt:169`                       |
| `technology` | `decryption_factor`                                               |     1 | `common/technologies/land_doctrine.txt:1730`                     |
| `technology` | `dependencies.HVantiair5`                                         |     1 | `common/technologies/TRM_armour_USA.txt:2557`                    |
| `technology` | `dependencies.HVantiair_direct2`                                  |     1 | `common/technologies/TRM_armour_GER.txt:2900`                    |
| `technology` | `dependencies.HVantitank2`                                        |     1 | `common/technologies/TRM_armour_FRA.txt:1666`                    |
| `technology` | `dependencies.Ltaircraft_industry`                                |     1 | `common/technologies/industry.txt:2135`                          |
| `technology` | `dependencies.Ltaircraft_industry2`                               |     1 | `common/technologies/industry.txt:2378`                          |
| `technology` | `dependencies.SMG_team1`                                          |     1 | `common/technologies/infantry.txt:1130`                          |
| `technology` | `dependencies.aa_emplacement_construction`                        |     1 | `common/technologies/industry.txt:3188`                          |
| `technology` | `dependencies.aa_emplacement_construction2`                       |     1 | `common/technologies/industry.txt:3812`                          |
| `technology` | `dependencies.aa_emplacement_construction3`                       |     1 | `common/technologies/industry.txt:4488`                          |
| `technology` | `dependencies.aa_emplacement_construction4`                       |     1 | `common/technologies/industry.txt:5148`                          |
| `technology` | `dependencies.advanced_centimetric_radar`                         |     1 | `common/technologies/MTG_naval_techs.txt:6206`                   |
| `technology` | `dependencies.advanced_computing_machine`                         |     1 | `common/technologies/industry.txt:605`                           |
| `technology` | `dependencies.air_infra`                                          |     1 | `common/technologies/industry.txt:3427`                          |
| `technology` | `dependencies.air_infra2`                                         |     1 | `common/technologies/industry.txt:4058`                          |
| `technology` | `dependencies.air_infra3`                                         |     1 | `common/technologies/industry.txt:4765`                          |
| `technology` | `dependencies.air_infra4`                                         |     1 | `common/technologies/industry.txt:5388`                          |
| `technology` | `dependencies.armor_command_doc`                                  |     1 | `common/technologies/land_doctrine.txt:6353`                     |
| `technology` | `dependencies.armor_support`                                      |     1 | `common/technologies/land_doctrine.txt:156`                      |
| `technology` | `dependencies.armoured_hangar`                                    |     1 | `common/technologies/MTG_naval.txt:4249`                         |
| `technology` | `dependencies.artillery1`                                         |     1 | `common/technologies/TRM_armour_JAP.txt:1567`                    |
| `technology` | `dependencies.artillery3`                                         |     1 | `common/technologies/TRM_armour_ITA.txt:1309`                    |
| `technology` | `dependencies.artillery_command_doc`                              |     1 | `common/technologies/land_doctrine.txt:6352`                     |
| `technology` | `dependencies.artillery_industry`                                 |     1 | `common/technologies/industry.txt:2094`                          |
| `technology` | `dependencies.artillery_industry2`                                |     1 | `common/technologies/industry.txt:2337`                          |
| `technology` | `dependencies.basic_decryption`                                   |     1 | `common/technologies/electronic_mechanical_engineering.txt:2482` |
| `technology` | `dependencies.basic_decryption_lar`                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:2795` |
| `technology` | `dependencies.basic_encryption`                                   |     1 | `common/technologies/electronic_mechanical_engineering.txt:2327` |
| `technology` | `dependencies.basic_encryption_lar`                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:2638` |
| `technology` | `dependencies.basic_heavy_armor_scheme`                           |     1 | `common/technologies/MTG_naval.txt:2805`                         |
| `technology` | `dependencies.basic_land_launched_rockets`                        |     1 | `common/technologies/artillery.txt:2279`                         |
| `technology` | `dependencies.catalytic_cracking`                                 |     1 | `common/technologies/civillian.txt:4322`                         |
| `technology` | `dependencies.chemical_industry_iv`                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:3338` |
| `technology` | `dependencies.civ_works`                                          |     1 | `common/technologies/industry.txt:3533`                          |
| `technology` | `dependencies.civ_works2`                                         |     1 | `common/technologies/industry.txt:4166`                          |
| `technology` | `dependencies.civ_works3`                                         |     1 | `common/technologies/industry.txt:4869`                          |
| `technology` | `dependencies.civ_works4`                                         |     1 | `common/technologies/industry.txt:5493`                          |
| `technology` | `dependencies.commercial_catalytic_cracking`                      |     1 | `common/technologies/civillian.txt:4369`                         |
| `technology` | `dependencies.continuous_fire`                                    |     1 | `common/technologies/land_doctrine.txt:840`                      |
| `technology` | `dependencies.decimetric_radar`                                   |     1 | `common/technologies/MTG_naval_techs.txt:6031`                   |
| `technology` | `dependencies.defence_works`                                      |     1 | `common/technologies/industry.txt:3141`                          |
| `technology` | `dependencies.defence_works2`                                     |     1 | `common/technologies/industry.txt:3774`                          |
| `technology` | `dependencies.defence_works3`                                     |     1 | `common/technologies/industry.txt:4449`                          |
| `technology` | `dependencies.defence_works4`                                     |     1 | `common/technologies/industry.txt:5108`                          |
| `technology` | `dependencies.early_radar`                                        |     1 | `common/technologies/MTG_naval_techs.txt:5972`                   |
| `technology` | `dependencies.early_ship_hull_cruiser`                            |     1 | `common/technologies/MTG_naval.txt:3085`                         |
| `technology` | `dependencies.electronic_computing_machine`                       |     1 | `common/technologies/MTG_naval_techs.txt:5300`                   |
| `technology` | `dependencies.excavation1`                                        |     1 | `common/technologies/civillian.txt:3803`                         |
| `technology` | `dependencies.excavation2`                                        |     1 | `common/technologies/civillian.txt:3849`                         |
| `technology` | `dependencies.excavation3`                                        |     1 | `common/technologies/civillian.txt:3919`                         |
| `technology` | `dependencies.excavation4`                                        |     1 | `common/technologies/civillian.txt:3970`                         |
| `technology` | `dependencies.fuel_cans`                                          |     1 | `common/technologies/armor_techs.txt:761`                        |
| `technology` | `dependencies.fuel_silos`                                         |     1 | `common/technologies/civillian.txt:3806`                         |
| `technology` | `dependencies.fuel_silos2`                                        |     1 | `common/technologies/civillian.txt:3852`                         |
| `technology` | `dependencies.fuel_silos3`                                        |     1 | `common/technologies/civillian.txt:3922`                         |
| `technology` | `dependencies.fuel_silos4`                                        |     1 | `common/technologies/civillian.txt:3973`                         |
| `technology` | `dependencies.hospital_work`                                      |     1 | `common/technologies/industry.txt:3620`                          |
| `technology` | `dependencies.hospital_work2`                                     |     1 | `common/technologies/industry.txt:4256`                          |
| `technology` | `dependencies.hospital_work3`                                     |     1 | `common/technologies/industry.txt:4958`                          |
| `technology` | `dependencies.hospital_work4`                                     |     1 | `common/technologies/industry.txt:5583`                          |
| `technology` | `dependencies.housing_work`                                       |     1 | `common/technologies/industry.txt:3578`                          |
| `technology` | `dependencies.housing_work2`                                      |     1 | `common/technologies/industry.txt:4212`                          |
| `technology` | `dependencies.housing_work3`                                      |     1 | `common/technologies/industry.txt:4915`                          |
| `technology` | `dependencies.housing_work4`                                      |     1 | `common/technologies/industry.txt:5540`                          |
| `technology` | `dependencies.improved_avionics`                                  |     1 | `common/technologies/MTG_naval_techs.txt:7112`                   |
| `technology` | `dependencies.improved_decimetric_radar`                          |     1 | `common/technologies/electronic_mechanical_engineering.txt:1269` |
| `technology` | `dependencies.improved_decryption`                                |     1 | `common/technologies/electronic_mechanical_engineering.txt:2535` |
| `technology` | `dependencies.improved_decryption_lar`                            |     1 | `common/technologies/electronic_mechanical_engineering.txt:2849` |
| `technology` | `dependencies.improved_encryption`                                |     1 | `common/technologies/electronic_mechanical_engineering.txt:2380` |
| `technology` | `dependencies.improved_encryption_lar`                            |     1 | `common/technologies/electronic_mechanical_engineering.txt:2691` |
| `technology` | `dependencies.improved_rocket_engines`                            |     1 | `common/technologies/GER_air.txt:5856`                           |
| `technology` | `dependencies.infantry_command_doc`                               |     1 | `common/technologies/land_doctrine.txt:6351`                     |
| `technology` | `dependencies.infra_works`                                        |     1 | `common/technologies/industry.txt:3295`                          |
| `technology` | `dependencies.infra_works2`                                       |     1 | `common/technologies/industry.txt:3924`                          |
| `technology` | `dependencies.infra_works3`                                       |     1 | `common/technologies/industry.txt:4603`                          |
| `technology` | `dependencies.infra_works4`                                       |     1 | `common/technologies/industry.txt:5256`                          |
| `technology` | `dependencies.mechanised_infantry3`                               |     1 | `common/technologies/TRM_armour_JAP.txt:1145`                    |
| `technology` | `dependencies.medartillery3`                                      |     1 | `common/technologies/TRM_armour_ITA.txt:1734`                    |
| `technology` | `dependencies.medartillery4`                                      |     1 | `common/technologies/TRM_armour_SOV.txt:2448`                    |
| `technology` | `dependencies.medartillery6`                                      |     1 | `common/technologies/TRM_armour_USA.txt:2596`                    |
| `technology` | `dependencies.military_production_i`                              |     1 | `common/technologies/industry.txt:1696`                          |
| `technology` | `dependencies.military_production_ii`                             |     1 | `common/technologies/industry.txt:1741`                          |
| `technology` | `dependencies.mntartillery1`                                      |     1 | `common/technologies/TRM_armour_minor_SWE.txt:641`               |
| `technology` | `dependencies.mobile_command_doc`                                 |     1 | `common/technologies/land_doctrine.txt:6350`                     |
| `technology` | `dependencies.mobile_doctrines`                                   |     1 | `common/technologies/land_doctrine.txt:361`                      |
| `technology` | `dependencies.nrm_battery_modern_6`                               |     1 | `common/technologies/MTG_naval_techs.txt:3351`                   |
| `technology` | `dependencies.nrm_carrier_defence`                                |     1 | `common/technologies/naval_doctrine.txt:6208`                    |
| `technology` | `dependencies.nrm_carrier_strike`                                 |     1 | `common/technologies/naval_doctrine.txt:6209`                    |
| `technology` | `dependencies.nrm_cruiser_flotilla_leader`                        |     1 | `common/technologies/naval_doctrine.txt:3023`                    |
| `technology` | `dependencies.nrm_db_combined_carrier`                            |     1 | `common/technologies/naval_doctrine.txt:3478`                    |
| `technology` | `dependencies.nrm_db_heavy_scouting`                              |     1 | `common/technologies/naval_doctrine.txt:3479`                    |
| `technology` | `dependencies.nrm_destroyer_screen_improved`                      |     1 | `common/technologies/naval_doctrine.txt:1921`                    |
| `technology` | `dependencies.nrm_escort_patrols`                                 |     1 | `common/technologies/MTG_naval.txt:1118`                         |
| `technology` | `dependencies.nrm_fleet_formation`                                |     1 | `common/technologies/naval_doctrine.txt:3644`                    |
| `technology` | `dependencies.nrm_scouting_force`                                 |     1 | `common/technologies/naval_doctrine.txt:4455`                    |
| `technology` | `dependencies.nrm_submarine_tactics_improved`                     |     1 | `common/technologies/naval_doctrine.txt:4766`                    |
| `technology` | `dependencies.nrm_submarine_torpedo_tactics`                      |     1 | `common/technologies/naval_doctrine.txt:4458`                    |
| `technology` | `dependencies.nrm_trade_interdiction`                             |     1 | `common/technologies/naval_doctrine.txt:2708`                    |
| `technology` | `dependencies.nuclear_weapons_research`                           |     1 | `common/technologies/electronic_mechanical_engineering.txt:4326` |
| `technology` | `dependencies.open_hangar`                                        |     1 | `common/technologies/MTG_naval.txt:4248`                         |
| `technology` | `dependencies.paratroopers`                                       |     1 | `common/technologies/infantry.txt:1031`                          |
| `technology` | `dependencies.paratroopers3`                                      |     1 | `common/technologies/support.txt:632`                            |
| `technology` | `dependencies.port_infra`                                         |     1 | `common/technologies/industry.txt:3477`                          |
| `technology` | `dependencies.port_infra3`                                        |     1 | `common/technologies/industry.txt:4815`                          |
| `technology` | `dependencies.port_infra4`                                        |     1 | `common/technologies/industry.txt:5438`                          |
| `technology` | `dependencies.pre_fab`                                            |     1 | `common/technologies/industry.txt:3236`                          |
| `technology` | `dependencies.pre_fab2`                                           |     1 | `common/technologies/industry.txt:3863`                          |
| `technology` | `dependencies.pre_fab3`                                           |     1 | `common/technologies/industry.txt:4539`                          |
| `technology` | `dependencies.pre_fab4`                                           |     1 | `common/technologies/industry.txt:5199`                          |
| `technology` | `dependencies.radio_equipment_support_group_tech`                 |     1 | `common/technologies/electronic_mechanical_engineering.txt:674`  |
| `technology` | `dependencies.rail_infra`                                         |     1 | `common/technologies/industry.txt:3335`                          |
| `technology` | `dependencies.rail_infra2`                                        |     1 | `common/technologies/industry.txt:3964`                          |
| `technology` | `dependencies.rail_infra3`                                        |     1 | `common/technologies/industry.txt:4672`                          |
| `technology` | `dependencies.rail_infra4`                                        |     1 | `common/technologies/industry.txt:5295`                          |
| `technology` | `dependencies.recon_command_doc`                                  |     1 | `common/technologies/land_doctrine.txt:6349`                     |
| `technology` | `dependencies.road_infra`                                         |     1 | `common/technologies/industry.txt:3377`                          |
| `technology` | `dependencies.road_infra2`                                        |     1 | `common/technologies/industry.txt:4007`                          |
| `technology` | `dependencies.road_infra3`                                        |     1 | `common/technologies/industry.txt:4714`                          |
| `technology` | `dependencies.road_infra4`                                        |     1 | `common/technologies/industry.txt:5337`                          |
| `technology` | `dependencies.rocket_artillery`                                   |     1 | `common/technologies/TRM_armour_GER.txt:3504`                    |
| `technology` | `dependencies.schools_work`                                       |     1 | `common/technologies/industry.txt:3660`                          |
| `technology` | `dependencies.schools_work2`                                      |     1 | `common/technologies/industry.txt:4296`                          |
| `technology` | `dependencies.schools_work3`                                      |     1 | `common/technologies/industry.txt:4998`                          |
| `technology` | `dependencies.schools_work4`                                      |     1 | `common/technologies/industry.txt:5623`                          |
| `technology` | `dependencies.semimodern_computing_machine`                       |     1 | `common/technologies/MTG_naval_techs.txt:5395`                   |
| `technology` | `dependencies.ship_industry`                                      |     1 | `common/technologies/industry.txt:2175`                          |
| `technology` | `dependencies.ship_industry2`                                     |     1 | `common/technologies/industry.txt:2418`                          |
| `technology` | `dependencies.ship_industry3`                                     |     1 | `common/technologies/MTG_naval.txt:1174`                         |
| `technology` | `dependencies.sub_industry`                                       |     1 | `common/technologies/industry.txt:2215`                          |
| `technology` | `dependencies.sub_industry2`                                      |     1 | `common/technologies/industry.txt:2458`                          |
| `technology` | `dependencies.sub_industry3`                                      |     1 | `common/technologies/MTG_naval.txt:665`                          |
| `technology` | `dependencies.synchrotron_particle_accelerators`                  |     1 | `common/technologies/electronic_mechanical_engineering.txt:4405` |
| `technology` | `dependencies.tech_air_engine_motorjet`                           |     1 | `common/technologies/ITA_air.txt:3511`                           |
| `technology` | `dependencies.tech_amiot_351_bomber_equipment_1`                  |     1 | `common/technologies/FRA_air.txt:2344`                           |
| `technology` | `dependencies.tech_ar_68_equipment_1`                             |     1 | `common/technologies/GER_air.txt:5259`                           |
| `technology` | `dependencies.tech_avro_anson_equipment_1`                        |     1 | `common/technologies/ENG_air.txt:1884`                           |
| `technology` | `dependencies.tech_avro_manchester_bomber_equipment_1`            |     1 | `common/technologies/ENG_air.txt:3975`                           |
| `technology` | `dependencies.tech_avro_york_transport_equipment_1`               |     1 | `common/technologies/ENG_air.txt:4545`                           |
| `technology` | `dependencies.tech_aw_whitley_equipment_1`                        |     1 | `common/technologies/ENG_air.txt:3619`                           |
| `technology` | `dependencies.tech_bell_p39_equipment_1`                          |     1 | `common/technologies/USA_air.txt:762`                            |
| `technology` | `dependencies.tech_bell_p39_equipment_2`                          |     1 | `common/technologies/USA_air.txt:801`                            |
| `technology` | `dependencies.tech_blackburn_skua_equipment_1`                    |     1 | `common/technologies/ENG_air.txt:2480`                           |
| `technology` | `dependencies.tech_bloch_131_bomber_equipment_1`                  |     1 | `common/technologies/FRA_air.txt:2004`                           |
| `technology` | `dependencies.tech_boeing_b17_equipment_4`                        |     1 | `common/technologies/USA_air.txt:3137`                           |
| `technology` | `dependencies.tech_br20_bomber_equipment_1`                       |     1 | `common/technologies/ITA_air.txt:2670`                           |
| `technology` | `dependencies.tech_brewster_f2a_equipment_1`                      |     1 | `common/technologies/USA_air.txt:4141`                           |
| `technology` | `dependencies.tech_bristol_beaufighter_equipment_1`               |     1 | `common/technologies/ENG_air.txt:1337`                           |
| `technology` | `dependencies.tech_bristol_beaufort_equipment_1`                  |     1 | `common/technologies/ENG_air.txt:1513`                           |
| `technology` | `dependencies.tech_bristol_blenheim_equipment_1`                  |     1 | `common/technologies/ENG_air.txt:1684`                           |
| `technology` | `dependencies.tech_bristol_buckingham_equipment_1`                |     1 | `common/technologies/ENG_air.txt:1468`                           |
| `technology` | `dependencies.tech_ca309_light_bomber_equipment_1`                |     1 | `common/technologies/ITA_air.txt:2201`                           |
| `technology` | `dependencies.tech_ca313_light_bomber_equipment_1`                |     1 | `common/technologies/ITA_air.txt:2272`                           |
| `technology` | `dependencies.tech_ca331_scout_equipment_1`                       |     1 | `common/technologies/ITA_air.txt:1610`                           |
| `technology` | `dependencies.tech_ca335_multirole_equipment_1`                   |     1 | `common/technologies/ITA_air.txt:1730`                           |
| `technology` | `dependencies.tech_consolidated_b24_equipment_2`                  |     1 | `common/technologies/USA_air.txt:3184`                           |
| `technology` | `dependencies.tech_consolidated_pb4y_equipment_2`                 |     1 | `common/technologies/USA_air.txt:3522`                           |
| `technology` | `dependencies.tech_curtiss_p40_equipment_2`                       |     1 | `common/technologies/USA_air.txt:441`                            |
| `technology` | `dependencies.tech_curtiss_sb2c_equipment_1`                      |     1 | `common/technologies/USA_air.txt:1815`                           |
| `technology` | `dependencies.tech_d_500_fighter_equipment_3`                     |     1 | `common/technologies/FRA_air.txt:1036`                           |
| `technology` | `dependencies.tech_db_3_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:2986`                           |
| `technology` | `dependencies.tech_do_17_z_bomber_equipment_1`                    |     1 | `common/technologies/GER_air.txt:1955`                           |
| `technology` | `dependencies.tech_do_217_bomber_equipment_1`                     |     1 | `common/technologies/GER_air.txt:2037`                           |
| `technology` | `dependencies.tech_douglas_a20_equipment_2`                       |     1 | `common/technologies/USA_air.txt:1898`                           |
| `technology` | `dependencies.tech_douglas_dauntless_equipment_1`                 |     1 | `common/technologies/USA_air.txt:1682`                           |
| `technology` | `dependencies.tech_douglas_dc3_transport_equipment_1`             |     1 | `common/technologies/USA_air.txt:5123`                           |
| `technology` | `dependencies.tech_fw_190_fighter_equipment_1`                    |     1 | `common/technologies/GER_air.txt:2696`                           |
| `technology` | `dependencies.tech_fw_200_transport_equipment_1`                  |     1 | `common/technologies/GER_air.txt:4968`                           |
| `technology` | `dependencies.tech_g50_fighter_equipment_1`                       |     1 | `common/technologies/ITA_air.txt:881`                            |
| `technology` | `dependencies.tech_g50_multirole_equipment_1`                     |     1 | `common/technologies/ITA_air.txt:3252`                           |
| `technology` | `dependencies.tech_g55_fighter_equipment_1`                       |     1 | `common/technologies/ITA_air.txt:1297`                           |
| `technology` | `dependencies.tech_gladiator_fighter_equipment_1`                 |     1 | `common/technologies/ENG_air.txt:2431`                           |
| `technology` | `dependencies.tech_griffon_fighter_equipment_1`                   |     1 | `common/technologies/ENG_air.txt:2670`                           |
| `technology` | `dependencies.tech_griffon_spitfire_equipment_1`                  |     1 | `common/technologies/ENG_air.txt:2025`                           |
| `technology` | `dependencies.tech_grumman_f3f_equipment_1`                       |     1 | `common/technologies/USA_air.txt:4140`                           |
| `technology` | `dependencies.tech_grumman_f4f_equipment_2`                       |     1 | `common/technologies/USA_air.txt:4237`                           |
| `technology` | `dependencies.tech_grumman_f6f_equipment_2`                       |     1 | `common/technologies/USA_air.txt:4333`                           |
| `technology` | `dependencies.tech_handley_halifax_equipment_1`                   |     1 | `common/technologies/ENG_air.txt:3658`                           |
| `technology` | `dependencies.tech_handley_harrow_bomber_equipment_1`             |     1 | `common/technologies/ENG_air.txt:4319`                           |
| `technology` | `dependencies.tech_hawker_seafury_equipment_1`                    |     1 | `common/technologies/ENG_air.txt:1115`                           |
| `technology` | `dependencies.tech_hawker_tempest_equipment_1`                    |     1 | `common/technologies/ENG_air.txt:2874`                           |
| `technology` | `dependencies.tech_he_111_bomber_equipment_4`                     |     1 | `common/technologies/GER_air.txt:4851`                           |
| `technology` | `dependencies.tech_he_111_h16_bomber_equipment_1`                 |     1 | `common/technologies/GER_air.txt:4643`                           |
| `technology` | `dependencies.tech_he_177_bomber_equipment_3`                     |     1 | `common/technologies/GER_air.txt:5177`                           |
| `technology` | `dependencies.tech_he_51_equipment_1`                             |     1 | `common/technologies/GER_air.txt:246`                            |
| `technology` | `dependencies.tech_he_70_bomber_equipment_1`                      |     1 | `common/technologies/GER_air.txt:2814`                           |
| `technology` | `dependencies.tech_i_153_equipment_1`                             |     1 | `common/technologies/SOV_air.txt:3244`                           |
| `technology` | `dependencies.tech_i_15_equipment_2`                              |     1 | `common/technologies/SOV_air.txt:3208`                           |
| `technology` | `dependencies.tech_i_16_equipment_4`                              |     1 | `common/technologies/SOV_air.txt:1128`                           |
| `technology` | `dependencies.tech_i_180_equipment_2`                             |     1 | `common/technologies/SOV_air.txt:1228`                           |
| `technology` | `dependencies.tech_il_4_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:3025`                           |
| `technology` | `dependencies.tech_ju_288_bomber_equipment_1`                     |     1 | `common/technologies/GER_air.txt:4517`                           |
| `technology` | `dependencies.tech_ju_290_bomber_equipment_1`                     |     1 | `common/technologies/GER_air.txt:5219`                           |
| `technology` | `dependencies.tech_ju_388_bomber_equipment_1`                     |     1 | `common/technologies/GER_air.txt:4518`                           |
| `technology` | `dependencies.tech_ju_86_p_bomber_equipment_1`                    |     1 | `common/technologies/GER_air.txt:2918`                           |
| `technology` | `dependencies.tech_ju_87_equipment_2`                             |     1 | `common/technologies/GER_air.txt:5431`                           |
| `technology` | `dependencies.tech_ju_87_equipment_5`                             |     1 | `common/technologies/GER_air.txt:5590`                           |
| `technology` | `dependencies.tech_ju_88_bomber_equipment_1`                      |     1 | `common/technologies/GER_air.txt:1996`                           |
| `technology` | `dependencies.tech_kawanishi_n1k4j_equipment_1`                   |     1 | `common/technologies/JAP_air.txt:5688`                           |
| `technology` | `dependencies.tech_kawasaki_ki_61_equipment_2`                    |     1 | `common/technologies/JAP_air.txt:671`                            |
| `technology` | `dependencies.tech_lagg_3_equipment_1`                            |     1 | `common/technologies/SOV_air.txt:1188`                           |
| `technology` | `dependencies.tech_lockheed_p38_equipment_1`                      |     1 | `common/technologies/USA_air.txt:2075`                           |
| `technology` | `dependencies.tech_lockheed_p38j_equipment_1`                     |     1 | `common/technologies/USA_air.txt:2114`                           |
| `technology` | `dependencies.tech_lockheed_pv1_equipment_1`                      |     1 | `common/technologies/USA_air.txt:3394`                           |
| `technology` | `dependencies.tech_maintenance_company3`                          |     1 | `common/technologies/armor_techs.txt:683`                        |
| `technology` | `dependencies.tech_me_109_mid_fighter_equipment_1`                |     1 | `common/technologies/GER_air.txt:5301`                           |
| `technology` | `dependencies.tech_me_155_fighter_equipment_1`                    |     1 | `common/technologies/GER_air.txt:1290`                           |
| `technology` | `dependencies.tech_mid_spitfire_equipment_1`                      |     1 | `common/technologies/ENG_air.txt:2571`                           |
| `technology` | `dependencies.tech_mig_3_equipment_1`                             |     1 | `common/technologies/SOV_air.txt:1414`                           |
| `technology` | `dependencies.tech_mitsubishi_g3m_equipment_1`                    |     1 | `common/technologies/JAP_air.txt:4216`                           |
| `technology` | `dependencies.tech_mitsubishi_g4m2_equipment_1`                   |     1 | `common/technologies/JAP_air.txt:4705`                           |
| `technology` | `dependencies.tech_mitsubishi_ki_21_equipment_1`                  |     1 | `common/technologies/JAP_air.txt:3937`                           |
| `technology` | `dependencies.tech_mitsubishi_ki_46_scout_equipment_1`            |     1 | `common/technologies/JAP_air.txt:3168`                           |
| `technology` | `dependencies.tech_mosquito_nf_equipment_1`                       |     1 | `common/technologies/ENG_air.txt:1590`                           |
| `technology` | `dependencies.tech_mosquito_scout_equipment_1`                    |     1 | `common/technologies/ENG_air.txt:1989`                           |
| `technology` | `dependencies.tech_mosquito_scout_equipment_2`                    |     1 | `common/technologies/ENG_air.txt:2060`                           |
| `technology` | `dependencies.tech_nakajima_g5n_equipment_1`                      |     1 | `common/technologies/JAP_air.txt:4297`                           |
| `technology` | `dependencies.tech_nakajima_g8n_equipment_1`                      |     1 | `common/technologies/JAP_air.txt:4353`                           |
| `technology` | `dependencies.tech_nakajima_ki_49_equipment_1`                    |     1 | `common/technologies/JAP_air.txt:4050`                           |
| `technology` | `dependencies.tech_northamerican_b25_equipment_2`                 |     1 | `common/technologies/USA_air.txt:3355`                           |
| `technology` | `dependencies.tech_northamerican_mustang_equipment_1`             |     1 | `common/technologies/USA_air.txt:1771`                           |
| `technology` | `dependencies.tech_northamerican_p51d_equipment_1`                |     1 | `common/technologies/USA_air.txt:2148`                           |
| `technology` | `dependencies.tech_northamerican_p51h_equipment_1`                |     1 | `common/technologies/USA_air.txt:1394`                           |
| `technology` | `dependencies.tech_northrop_bt_equipment_1`                       |     1 | `common/technologies/USA_air.txt:4530`                           |
| `technology` | `dependencies.tech_northrop_p61_equipment_1`                      |     1 | `common/technologies/USA_air.txt:2182`                           |
| `technology` | `dependencies.tech_p50_heavy_bomber_equipment_1`                  |     1 | `common/technologies/ITA_air.txt:2938`                           |
| `technology` | `dependencies.tech_pe_1_fighter_equipment_1`                      |     1 | `common/technologies/SOV_air.txt:2403`                           |
| `technology` | `dependencies.tech_pe_2_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:2141`                           |
| `technology` | `dependencies.tech_pe_8_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:3571`                           |
| `technology` | `dependencies.tech_potez_631_fighter_equipment_1`                 |     1 | `common/technologies/FRA_air.txt:1955`                           |
| `technology` | `dependencies.tech_r_10_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:2108`                           |
| `technology` | `dependencies.tech_r_5_bomber_equipment_3`                        |     1 | `common/technologies/SOV_air.txt:2075`                           |
| `technology` | `dependencies.tech_re2000_multirole_equipment_1`                  |     1 | `common/technologies/ITA_air.txt:1805`                           |
| `technology` | `dependencies.tech_re2005_multirole_equipment_1`                  |     1 | `common/technologies/ITA_air.txt:1843`                           |
| `technology` | `dependencies.tech_republic_p43_equipment_1`                      |     1 | `common/technologies/USA_air.txt:1011`                           |
| `technology` | `dependencies.tech_republic_p47d_equipment_1`                     |     1 | `common/technologies/USA_air.txt:841`                            |
| `technology` | `dependencies.tech_short_sunderland_equipment_1`                  |     1 | `common/technologies/ENG_air.txt:3884`                           |
| `technology` | `dependencies.tech_sm79_naval_bomber_equipment_1`                 |     1 | `common/technologies/ITA_air.txt:3134`                           |
| `technology` | `dependencies.tech_su_2_equipment_1`                              |     1 | `common/technologies/SOV_air.txt:3428`                           |
| `technology` | `dependencies.tech_su_6_equipment_1`                              |     1 | `common/technologies/SOV_air.txt:3465`                           |
| `technology` | `dependencies.tech_tb_3_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:3509`                           |
| `technology` | `dependencies.tech_transport_ki_34_equipment_1`                   |     1 | `common/technologies/JAP_air.txt:4108`                           |
| `technology` | `dependencies.tech_trm_armour_addon`                              |     1 | `common/technologies/armor_techs_GER.txt:156`                    |
| `technology` | `dependencies.tech_trm_armour_construction_welded_eng`            |     1 | `common/technologies/armor_techs_ENG.txt:354`                    |
| `technology` | `dependencies.tech_trm_armour_construction_welded_hun`            |     1 | `common/technologies/armor_techs_minor_HUN.txt:226`              |
| `technology` | `dependencies.tech_trm_armour_construction_welded_ita`            |     1 | `common/technologies/armor_techs_ITA.txt:267`                    |
| `technology` | `dependencies.tech_trm_armour_construction_welded_jap`            |     1 | `common/technologies/armor_techs_JAP.txt:224`                    |
| `technology` | `dependencies.tech_trm_armour_construction_welded_usa`            |     1 | `common/technologies/armor_techs_USA.txt:306`                    |
| `technology` | `dependencies.tech_trm_cavalry_tank_chassis_eng_mk2_1`            |     1 | `common/technologies/TRM_armour_ENG.txt:1556`                    |
| `technology` | `dependencies.tech_trm_cavalry_tank_eng_mk6_aa_1`                 |     1 | `common/technologies/TRM_armour_ENG.txt:1154`                    |
| `technology` | `dependencies.tech_trm_heavy_tank_chassis_eng_churchill_3`        |     1 | `common/technologies/TRM_armour_ENG.txt:2138`                    |
| `technology` | `dependencies.tech_trm_heavy_tank_chassis_eng_excelsior_1`        |     1 | `common/technologies/TRM_armour_ENG.txt:2139`                    |
| `technology` | `dependencies.tech_trm_heavy_tank_chassis_fra_tracteurb_1`        |     1 | `common/technologies/TRM_armour_FRA.txt:1234`                    |
| `technology` | `dependencies.tech_trm_heavy_tank_chassis_ita_p26_1`              |     1 | `common/technologies/TRM_armour_ITA.txt:756`                     |
| `technology` | `dependencies.tech_trm_heavy_tank_chassis_sov_is_1`               |     1 | `common/technologies/TRM_armour_SOV.txt:1662`                    |
| `technology` | `dependencies.tech_trm_heavy_tank_sov_kv1_casemate_1`             |     1 | `common/technologies/TRM_armour_SOV.txt:1663`                    |
| `technology` | `dependencies.tech_trm_infantry_tank_chassis_eng_matilda1_1`      |     1 | `common/technologies/TRM_armour_ENG.txt:1555`                    |
| `technology` | `dependencies.tech_trm_infantry_tank_chassis_eng_matilda2_1`      |     1 | `common/technologies/TRM_armour_ENG.txt:1856`                    |
| `technology` | `dependencies.tech_trm_infantry_tank_chassis_eng_valentine_1`     |     1 | `common/technologies/TRM_armour_ENG.txt:1857`                    |
| `technology` | `dependencies.tech_trm_infantry_tank_chassis_sov_t28_2`           |     1 | `common/technologies/TRM_armour_SOV.txt:912`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_ger_panzer1_2`          |     1 | `common/technologies/TRM_armour_GER.txt:315`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_ger_panzer2_2`          |     1 | `common/technologies/armor_techs_GER.txt:70`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_jap_type95_1`           |     1 | `common/technologies/TRM_armour_JAP.txt:575`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_sov_t26_3`              |     1 | `common/technologies/TRM_armour_SOV.txt:468`                     |
| `technology` | `dependencies.tech_trm_light_tank_chassis_usa_m3_1`               |     1 | `common/technologies/TRM_armour_USA.txt:1897`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_eng_mk8_1`             |     1 | `common/technologies/TRM_armour_ENG.txt:1153`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_eng_mk8_2`             |     1 | `common/technologies/TRM_armour_ENG.txt:2062`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_fra_sarl42_1`          |     1 | `common/technologies/TRM_armour_FRA.txt:1233`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_ger_panzer4_2`         |     1 | `common/technologies/TRM_armour_GER.txt:2205`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_ger_panzer4_4`         |     1 | `common/technologies/TRM_armour_GER.txt:1693`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_jap_type1_1`           |     1 | `common/technologies/TRM_armour_JAP.txt:618`                     |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_jap_type97_1`          |     1 | `common/technologies/TRM_armour_JAP.txt:339`                     |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_usa_m4_2`              |     1 | `common/technologies/TRM_armour_USA.txt:1327`                    |
| `technology` | `dependencies.tech_trm_medium_tank_chassis_usa_t23_1`             |     1 | `common/technologies/TRM_armour_USA.txt:1132`                    |
| `technology` | `dependencies.tech_trm_medium_tank_ger_panzer3_casemate_1`        |     1 | `common/technologies/TRM_armour_GER.txt:1414`                    |
| `technology` | `dependencies.tech_trm_medium_tank_ita_m13_casemate_1`            |     1 | `common/technologies/TRM_armour_ITA.txt:794`                     |
| `technology` | `dependencies.tech_trm_medium_tank_ita_m14_superstructure_open_1` |     1 | `common/technologies/TRM_armour_ITA.txt:828`                     |
| `technology` | `dependencies.tech_trm_medium_tank_usa_m4_turret_open_1`          |     1 | `common/technologies/TRM_armour_USA.txt:1326`                    |
| `technology` | `dependencies.tech_trm_suspension_christie_eng`                   |     1 | `common/technologies/armor_techs_ENG.txt:738`                    |
| `technology` | `dependencies.tech_trm_suspension_christie_ita`                   |     1 | `common/technologies/armor_techs_ITA.txt:544`                    |
| `technology` | `dependencies.tech_trm_suspension_torsion_sov`                    |     1 | `common/technologies/armor_techs_SOV.txt:678`                    |
| `technology` | `dependencies.tech_trm_weapon_ac_ita_20_breda35`                  |     1 | `common/technologies/TRM_armour_ITA.txt:1543`                    |
| `technology` | `dependencies.tech_trm_weapon_art_eng_88_25pdr`                   |     1 | `common/technologies/TRM_armour_ENG.txt:3241`                    |
| `technology` | `dependencies.tech_trm_weapon_art_ger_150_sig33`                  |     1 | `common/technologies/TRM_armour_GER.txt:3464`                    |
| `technology` | `dependencies.tech_trm_weapon_c_eng_40_2pdr`                      |     1 | `common/technologies/TRM_armour_ENG.txt:2746`                    |
| `technology` | `dependencies.tech_trm_weapon_c_ger_105_kwk45`                    |     1 | `common/technologies/TRM_armour_GER.txt:2364`                    |
| `technology` | `dependencies.tech_trm_weapon_c_usa_90_t15`                       |     1 | `common/technologies/TRM_armour_USA.txt:1503`                    |
| `technology` | `dependencies.tech_trm_weapon_mg_sov_dshk`                        |     1 | `common/technologies/TRM_armour_SOV.txt:2679`                    |
| `technology` | `dependencies.tech_tu_2_bomber_equipment_1`                       |     1 | `common/technologies/SOV_air.txt:2174`                           |
| `technology` | `dependencies.tech_vickers_warwick_equipment_1`                   |     1 | `common/technologies/ENG_air.txt:4511`                           |
| `technology` | `dependencies.tech_vickers_wellington_bomber_equipment_1`         |     1 | `common/technologies/ENG_air.txt:4443`                           |
| `technology` | `dependencies.tech_vickers_wellington_bomber_equipment_2`         |     1 | `common/technologies/ENG_air.txt:3481`                           |
| `technology` | `dependencies.tech_vought_corsair_cv_equipment_3`                 |     1 | `common/technologies/USA_air.txt:3846`                           |
| `technology` | `dependencies.tech_yak_1_equipment_1`                             |     1 | `common/technologies/SOV_air.txt:3285`                           |
| `technology` | `dependencies.tech_yak_9_equipment_1`                             |     1 | `common/technologies/SOV_air.txt:1353`                           |
| `technology` | `dependencies.tech_yokosuka_b3y_equipment_1`                      |     1 | `common/technologies/JAP_air.txt:6166`                           |
| `technology` | `dependencies.tech_yokosuka_d4y_equipment_1`                      |     1 | `common/technologies/JAP_air.txt:3111`                           |
| `technology` | `dependencies.tech_yokosuka_p1_equipment_1`                       |     1 | `common/technologies/JAP_air.txt:4756`                           |
| `technology` | `dependencies.tech_z1018_bomber_equipment_1`                      |     1 | `common/technologies/ITA_air.txt:1648`                           |
| `technology` | `dependencies.vehicle_industry`                                   |     1 | `common/technologies/industry.txt:2053`                          |
| `technology` | `dependencies.vehicle_industry2`                                  |     1 | `common/technologies/industry.txt:2297`                          |
| `technology` | `dependencies.vehicle_radio`                                      |     1 | `common/technologies/ITA_air.txt:3557`                           |
| `technology` | `desc`                                                            |     1 | `common/technologies/electronic_mechanical_engineering.txt:275`  |
| `technology` | `encryption_factor`                                               |     1 | `common/technologies/industry.txt:4333`                          |
| `technology` | `equipment_upgrade_xp_cost`                                       |     1 | `common/technologies/land_doctrine.txt:5340`                     |
| `technology` | `experience_gain_air_factor`                                      |     1 | `common/technologies/air_doctrine.txt:283`                       |
| `technology` | `experience_gain_airborne_artillery_brigade_combat_factor`        |     1 | `common/technologies/land_doctrine.txt:6642`                     |
| `technology` | `experience_gain_airborne_artillery_brigade_training_factor`      |     1 | `common/technologies/land_doctrine.txt:6632`                     |
| `technology` | `experience_gain_army_unit_factor`                                |     1 | `common/technologies/land_doctrine.txt:5190`                     |
| `technology` | `experience_gain_artillery_brigade_combat_factor`                 |     1 | `common/technologies/land_doctrine.txt:6635`                     |
| `technology` | `experience_gain_artillery_brigade_med_combat_factor`             |     1 | `common/technologies/land_doctrine.txt:6636`                     |
| `technology` | `experience_gain_artillery_brigade_med_training_factor`           |     1 | `common/technologies/land_doctrine.txt:6626`                     |
| `technology` | `experience_gain_artillery_brigade_mot_combat_factor`             |     1 | `common/technologies/land_doctrine.txt:6637`                     |
| `technology` | `experience_gain_artillery_brigade_mot_med_combat_factor`         |     1 | `common/technologies/land_doctrine.txt:6638`                     |
| `technology` | `experience_gain_artillery_brigade_mot_med_training_factor`       |     1 | `common/technologies/land_doctrine.txt:6628`                     |
| `technology` | `experience_gain_artillery_brigade_mot_training_factor`           |     1 | `common/technologies/land_doctrine.txt:6627`                     |
| `technology` | `experience_gain_artillery_brigade_training_factor`               |     1 | `common/technologies/land_doctrine.txt:6625`                     |
| `technology` | `experience_gain_artillery_division_combat_factor`                |     1 | `common/technologies/land_doctrine.txt:6639`                     |
| `technology` | `experience_gain_artillery_division_training_factor`              |     1 | `common/technologies/land_doctrine.txt:6629`                     |
| `technology` | `experience_gain_cavalry_combat_factor`                           |     1 | `common/technologies/land_doctrine.txt:5970`                     |
| `technology` | `experience_gain_cavalry_training_factor`                         |     1 | `common/technologies/land_doctrine.txt:5963`                     |
| `technology` | `experience_gain_garrison_combat_factor`                          |     1 | `common/technologies/land_doctrine.txt:5852`                     |
| `technology` | `experience_gain_garrison_training_factor`                        |     1 | `common/technologies/land_doctrine.txt:5843`                     |
| `technology` | `experience_gain_gurkha_combat_factor`                            |     1 | `common/technologies/land_doctrine.txt:7182`                     |
| `technology` | `experience_gain_infantry_assault_combat_factor`                  |     1 | `common/technologies/land_doctrine.txt:5850`                     |
| `technology` | `experience_gain_infantry_assault_training_factor`                |     1 | `common/technologies/land_doctrine.txt:5841`                     |
| `technology` | `experience_gain_infantry_combat_factor`                          |     1 | `common/technologies/land_doctrine.txt:5849`                     |
| `technology` | `experience_gain_infantry_training_factor`                        |     1 | `common/technologies/land_doctrine.txt:5840`                     |
| `technology` | `experience_gain_light_infantry_combat_factor`                    |     1 | `common/technologies/land_doctrine.txt:5851`                     |
| `technology` | `experience_gain_light_infantry_training_factor`                  |     1 | `common/technologies/land_doctrine.txt:5842`                     |
| `technology` | `experience_gain_marine_assault_training_factor`                  |     1 | `common/technologies/land_doctrine.txt:5846`                     |
| `technology` | `experience_gain_marine_training_factor`                          |     1 | `common/technologies/land_doctrine.txt:5845`                     |
| `technology` | `experience_gain_mechanized_assault_combat_factor`                |     1 | `common/technologies/land_doctrine.txt:5976`                     |
| `technology` | `experience_gain_mechanized_assault_training_factor`              |     1 | `common/technologies/land_doctrine.txt:5969`                     |
| `technology` | `experience_gain_mechanized_combat_factor`                        |     1 | `common/technologies/land_doctrine.txt:5975`                     |
| `technology` | `experience_gain_mechanized_training_factor`                      |     1 | `common/technologies/land_doctrine.txt:5968`                     |
| `technology` | `experience_gain_militia_combat_factor`                           |     1 | `common/technologies/land_doctrine.txt:5853`                     |
| `technology` | `experience_gain_militia_training_factor`                         |     1 | `common/technologies/land_doctrine.txt:5844`                     |
| `technology` | `experience_gain_motorized_assault_combat_factor`                 |     1 | `common/technologies/land_doctrine.txt:5974`                     |
| `technology` | `experience_gain_motorized_assault_training_factor`               |     1 | `common/technologies/land_doctrine.txt:5967`                     |
| `technology` | `experience_gain_motorized_combat_factor`                         |     1 | `common/technologies/land_doctrine.txt:5973`                     |
| `technology` | `experience_gain_motorized_rocket_brigade_combat_factor`          |     1 | `common/technologies/land_doctrine.txt:6644`                     |
| `technology` | `experience_gain_motorized_rocket_brigade_training_factor`        |     1 | `common/technologies/land_doctrine.txt:6634`                     |
| `technology` | `experience_gain_motorized_training_factor`                       |     1 | `common/technologies/land_doctrine.txt:5966`                     |
| `technology` | `experience_gain_mountain_artillery_brigade_combat_factor`        |     1 | `common/technologies/land_doctrine.txt:6640`                     |
| `technology` | `experience_gain_mountain_artillery_brigade_mot_combat_factor`    |     1 | `common/technologies/land_doctrine.txt:6641`                     |
| `technology` | `experience_gain_mountain_artillery_brigade_mot_training_factor`  |     1 | `common/technologies/land_doctrine.txt:6631`                     |
| `technology` | `experience_gain_mountain_artillery_brigade_training_factor`      |     1 | `common/technologies/land_doctrine.txt:6630`                     |
| `technology` | `experience_gain_mountaineers_training_factor`                    |     1 | `common/technologies/land_doctrine.txt:5847`                     |
| `technology` | `experience_gain_paratrooper_training_factor`                     |     1 | `common/technologies/land_doctrine.txt:5848`                     |
| `technology` | `experience_gain_recon_ac_combat_factor`                          |     1 | `common/technologies/land_doctrine.txt:6089`                     |
| `technology` | `experience_gain_recon_ac_training_factor`                        |     1 | `common/technologies/land_doctrine.txt:6085`                     |
| `technology` | `experience_gain_recon_cav_combat_factor`                         |     1 | `common/technologies/land_doctrine.txt:6087`                     |
| `technology` | `experience_gain_recon_cav_training_factor`                       |     1 | `common/technologies/land_doctrine.txt:6083`                     |
| `technology` | `experience_gain_recon_combat_factor`                             |     1 | `common/technologies/land_doctrine.txt:6086`                     |
| `technology` | `experience_gain_recon_mot_combat_factor`                         |     1 | `common/technologies/land_doctrine.txt:6088`                     |
| `technology` | `experience_gain_recon_mot_training_factor`                       |     1 | `common/technologies/land_doctrine.txt:6084`                     |
| `technology` | `experience_gain_recon_training_factor`                           |     1 | `common/technologies/land_doctrine.txt:6082`                     |
| `technology` | `experience_gain_rocket_artillery_brigade_combat_factor`          |     1 | `common/technologies/land_doctrine.txt:6643`                     |
| `technology` | `experience_gain_rocket_artillery_brigade_training_factor`        |     1 | `common/technologies/land_doctrine.txt:6633`                     |
| `technology` | `experience_gain_semi_motorized_assault_combat_factor`            |     1 | `common/technologies/land_doctrine.txt:5972`                     |
| `technology` | `experience_gain_semi_motorized_assault_training_factor`          |     1 | `common/technologies/land_doctrine.txt:5965`                     |
| `technology` | `experience_gain_semi_motorized_combat_factor`                    |     1 | `common/technologies/land_doctrine.txt:5971`                     |
| `technology` | `experience_gain_semi_motorized_training_factor`                  |     1 | `common/technologies/land_doctrine.txt:5964`                     |
| `technology` | `extra_marine_supply_grace`                                       |     1 | `common/technologies/land_doctrine.txt:7290`                     |
| `technology` | `fascist_militia`                                                 |     1 | `common/technologies/_hidden.txt:2355`                           |
| `technology` | `food_gain_factor`                                                |     1 | `common/technologies/civillian.txt:1295`                         |
| `technology` | `food_resource_factor`                                            |     1 | `common/technologies/civillian.txt:769`                          |
| `technology` | `guards_motorized_rocket_brigade`                                 |     1 | `common/technologies/artillery.txt:2481`                         |
| `technology` | `guards_mountain_artillery_brigade`                               |     1 | `common/technologies/artillery.txt:1246`                         |
| `technology` | `guards_mountain_artillery_brigade_mot`                           |     1 | `common/technologies/artillery.txt:1252`                         |
| `technology` | `intel_network_gain_factor`                                       |     1 | `common/technologies/land_doctrine.txt:3564`                     |
| `technology` | `land_equipment_upgrade_xp_cost`                                  |     1 | `common/technologies/land_doctrine.txt:5339`                     |
| `technology` | `license_production_speed`                                        |     1 | `common/technologies/land_doctrine.txt:5303`                     |
| `technology` | `license_purchase_cost`                                           |     1 | `common/technologies/land_doctrine.txt:5304`                     |
| `technology` | `logistics_company`                                               |     1 | `common/technologies/_hidden.txt:2137`                           |
| `technology` | `logistics_company_car`                                           |     1 | `common/technologies/_hidden.txt:2142`                           |
| `technology` | `logistics_company_mech`                                          |     1 | `common/technologies/_hidden.txt:2152`                           |
| `technology` | `logistics_company_mot`                                           |     1 | `common/technologies/_hidden.txt:2147`                           |
| `technology` | `maintenance_company_arm`                                         |     1 | `common/technologies/armor_techs.txt:1313`                       |
| `technology` | `max_command_power`                                               |     1 | `common/technologies/land_doctrine.txt:4926`                     |
| `technology` | `max_dig_in_factor`                                               |     1 | `common/technologies/land_doctrine.txt:4484`                     |
| `technology` | `mobilization_speed`                                              |     1 | `common/technologies/land_doctrine.txt:5244`                     |
| `technology` | `motorized_rocket_brigade`                                        |     1 | `common/technologies/artillery.txt:2473`                         |
| `technology` | `mountain_artillery_brigade`                                      |     1 | `common/technologies/artillery.txt:1228`                         |
| `technology` | `mountain_artillery_brigade_mot`                                  |     1 | `common/technologies/artillery.txt:1234`                         |
| `technology` | `nkvd`                                                            |     1 | `common/technologies/_hidden.txt:866`                            |
| `technology` | `nuclear_production`                                              |     1 | `common/technologies/electronic_mechanical_engineering.txt:4380` |
| `technology` | `nuclear_production_factor`                                       |     1 | `common/technologies/special_projects_tech.txt:117`              |
| `technology` | `paradrop_organization_factor`                                    |     1 | `common/technologies/land_doctrine.txt:7150`                     |
| `technology` | `paratrooper_aa_defense`                                          |     1 | `common/technologies/land_doctrine.txt:7118`                     |
| `technology` | `path.ignore_for_layout`                                          |     1 | `common/technologies/MTG_naval.txt:2684`                         |
| `technology` | `political_power_factor`                                          |     1 | `common/technologies/industry.txt:4334`                          |
| `technology` | `political_power_gain`                                            |     1 | `common/technologies/electronic_mechanical_engineering.txt:179`  |
| `technology` | `press_cost_factor`                                               |     1 | `common/technologies/electronic_mechanical_engineering.txt:180`  |
| `technology` | `production_speed_air_assembly_factor`                            |     1 | `common/technologies/industry.txt:5385`                          |
| `technology` | `production_speed_pillbox_factor`                                 |     1 | `common/technologies/land_doctrine.txt:3696`                     |
| `technology` | `production_speed_shipyard_factor`                                |     1 | `common/technologies/civillian.txt:2787`                         |
| `technology` | `promote_cost_factor`                                             |     1 | `common/technologies/land_doctrine.txt:5189`                     |
| `technology` | `recon_mech`                                                      |     1 | `common/technologies/_hidden.txt:1118`                           |
| `technology` | `river_crossing_factor`                                           |     1 | `common/technologies/land_doctrine.txt:7238`                     |
| `technology` | `rocket_interceptor`                                              |     1 | `common/technologies/electronic_mechanical_engineering.txt:3330` |
| `technology` | `shipyard_capital_capacity`                                       |     1 | `common/technologies/_hidden.txt:1222`                           |
| `technology` | `special_forces_out_of_supply_factor`                             |     1 | `common/technologies/land_doctrine.txt:7000`                     |
| `technology` | `specialization_nuclear_speed_factor`                             |     1 | `common/technologies/special_projects_tech.txt:116`              |
| `technology` | `ss_anti_tank_brigade`                                            |     1 | `common/technologies/_hidden.txt:2328`                           |
| `technology` | `ss_anti_tank_brigade_med`                                        |     1 | `common/technologies/_hidden.txt:2334`                           |
| `technology` | `ss_anti_tank_brigade_mot`                                        |     1 | `common/technologies/_hidden.txt:2331`                           |
| `technology` | `ss_anti_tank_brigade_mot_med`                                    |     1 | `common/technologies/_hidden.txt:2337`                           |
| `technology` | `ss_motorized_rocket_brigade`                                     |     1 | `common/technologies/artillery.txt:2477`                         |
| `technology` | `ss_mountain_artillery_brigade`                                   |     1 | `common/technologies/artillery.txt:1258`                         |
| `technology` | `ss_mountain_artillery_brigade_mot`                               |     1 | `common/technologies/artillery.txt:1264`                         |
| `technology` | `steel_energy_cost`                                               |     1 | `common/technologies/civillian.txt:2831`                         |
| `technology` | `strategic_bomb_visibility`                                       |     1 | `common/technologies/air_doctrine.txt:1916`                      |
| `technology` | `war_support_weekly`                                              |     1 | `common/technologies/land_doctrine.txt:5414`                     |
