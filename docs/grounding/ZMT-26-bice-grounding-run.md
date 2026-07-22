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
