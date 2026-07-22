# ZMT-24 — First real-corpus grounding run — report

- **Ticket**: ZMT-24 — First real-corpus grounding run: E24 gate discharge, coverage inventory, baseline seed
- **Date**: 2026-07-21
- **Harness**: ZMT-23 data-grounding tool (ADR 023)
- **Corpus target**: BICE mod fork (ADR 023 decision 7)

## Headline

**The three real-corpus jobs of this ticket could not be executed in this session, because the BICE corpus is not present in the environment and cannot be provisioned into it.** ADR 022 gates 2 and 3 therefore remain **outstanding** — the same status ADR 022 recorded — and the baseline was **not** reseeded. Nothing was fabricated and no weaker substitute was accepted (standing acceptance criterion).

What _was_ done: the harness itself was validated end-to-end against the shipped synthetic fixture (it is sound — no defect), the full suite was run, the three known drops were confirmed in the current baseline, and the structural mechanism of each drop was traced from the extractor code — including a definitive, code-level answer to Job 2's "most important question."

This is a **gate that cannot be run** in the sense of the standing acceptance criterion, and the reason is an internal contradiction between this ticket and ADR 023, described under [The conflict](#the-conflict) below.

## The conflict (standing acceptance criterion)

ADR 023 **decision 5** designs the harness as a **local pre-merge gate that does not run in CI**, over a corpus that is **never vendored** ("real mod data is not vendored… It is a local pre-merge gate"). This ticket asks for "the first real-corpus grounding run" to be executed **in this session**. A cloud CC session is an ephemeral, freshly-cloned container — it is **CI-equivalent** for every constraint ADR 023 placed on the harness:

1. **No corpus.** The BICE mod is un-vendored local data (ADR 023 D5, D7). It is absent from this container, and there is no env var (`ZMT_GROUNDING_CORPUS`), no `corpus.local.json`, no submodule, no on-disk copy, and no provisioning/download step. Verified by exhaustive search (see [Environment probe](#environment-probe)).
2. **No Electron runtime for the write path.** Gate 3 exercises the real `entity-mutation.service`, which is Electron-main code backed by `electron-store` and needs Electron's `app` to construct. The harness's own runner is plain `node` (`project.json` → `node dist/tools/data-grounding/main.cjs`), so the write round-trip degrades to **`blocked`** — by the harness's deliberate design (`write-driver.util.ts`: "a data gate is not satisfied by an argument that it must pass"). Even _with_ the corpus, Gate 3 reports `blocked` under the `node` runner, not `pass`.
3. **Electron binary is org-policy-blocked here.** `npm` postinstall of the Electron binary returns **403 Forbidden** through the egress proxy (a policy denial the proxy README says to report, not retry). This independently prevents any Electron runtime in this container and fails two `electron:test` spec files at import.

**Consequence:** "First real-corpus grounding run" is, as written, **not executable from a cloud CC session**. It is a local operator task on a machine that holds BICE and can run Electron. This is surfaced per the standing acceptance criterion rather than silently resolved. It does not require an ADR change to _act on_ — it requires the run to happen where ADR 023 always said it would (locally) — but if the intent is for this ticket to be dischargeable from cloud, that intent contradicts ADR 023 D5 and should be reconciled explicitly (e.g. provision a read-only BICE snapshot into the environment **and** an Electron-capable runner, or move gate-discharge to a local run and keep the cloud PR as the review surface).

## Job 1 — ADR 022 gates 2 and 3 (by name)

Reported by name, with results, as required.

| Gate               | Statement                                                                                                  | Result                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR 022 gate 2** | Every `common/technologies/*.txt` file in BICE round-trips **byte-identically** through parse → serialize. | **OUTSTANDING — not run.** No BICE corpus in the environment. Not a pass; not a fail.                                                                                                                                        |
| **ADR 022 gate 3** | An unmodified write through `entity-mutation.service` is **byte-identical** for every one of those files.  | **OUTSTANDING — not run, and double-blocked.** No BICE corpus; and the write path needs an Electron runtime the harness's `node` runner does not provide (reports `blocked`), compounded by the 403-blocked Electron binary. |

Per Job 1's instruction — _"If either gate fails, stop and report. Do not seed a baseline over a corpus the round-trip does not survive"_ — neither gate **failed**; both were **unrunnable**. The correct disposition for "unrunnable" is identical to the disposition for "failed" with respect to Job 3: **do not seed the baseline.** Job 3 was not performed (see below).

The whole-corpus round-trip (Job 1's "run across the whole corpus, not only `common/technologies`") is likewise not run, for the same reason.

### What the round-trip _does_ do where a corpus exists

Against the shipped synthetic fixture (a stand-in, **not** BICE — reported here only as evidence the instrument works, never as satisfying a gate):

- parse: all files parse with **zero** errors.
- parse → serialize → byte-identity: **all files identical.**
- parse → extract → unmodified write via `entity-mutation.service`: **`⚠ BLOCKED`** — Electron runtime unavailable (as expected in headless node; the harness degrades gracefully and does not count it as pass or fail).
- corpus immutability: **verified** (before/after content hash — no file under the corpus root changed).

## Job 2 — Coverage inventory

**The BICE coverage inventory — the deliverable — could not be produced**, because it is by definition a set difference computed over the real corpus, which is absent. The items below are what can be stated truthfully without the corpus; each is marked with its evidentiary basis.

### 2.3 — The three known drops (call-outs)

All three are expected in this output (they are already-known, separately-ticketed drops). Their **real BICE occurrence counts cannot be produced here** (no corpus). What can be confirmed:

| Known drop                                | In current (fixture) baseline?                  | Real BICE count                                                                                                                                                                                                | Basis                  |
| ----------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `dependencies` in the `{ tech = 1 }` form | **Yes** — `technology › dependencies.artillery` | **Unknown here.** ADR 022 records the `@`-substitution class as _1,827 defs / 5,351 uses / 46 files_ in `common/technologies`; it does **not** publish a separate `dependencies`-form count. Requires the run. | Baseline file; ADR 022 |
| `sub_technologies`                        | **Yes** — `technology › sub_technologies`       | Unknown here — requires the run.                                                                                                                                                                               | Baseline file          |
| uppercase `XOR`                           | **Yes** — `technology › XOR`                    | Unknown here — requires the run.                                                                                                                                                                               | Baseline file          |

I cannot honestly "confirm each appears with its real occurrence count in BICE" — that clause of Job 2.3 **presupposes the BICE run**, which did not happen. I confirm instead that all three are present in the committed baseline and trace _why_ each drops in [2.5](#25--mechanism-of-each-known-drop-code-level).

### 2.4 — The most important question: unmodeled keys inside a believed-modeled region

**This can be answered at the code level for the known drops, and the answer is yes — with a precise, verifiable mechanism.** What cannot be answered without the corpus is the _completeness_ half: whether BICE contains _additional_, non-baseline instances of this class.

The coverage walker (`key-path.util.ts`) descends into a source block **only if that block's key path is in the modeled set**, and reports any child key path not in the set:

- **`dependencies.<tech>` is an unmodeled key inside a believed-modeled block.** `modeledTechnology` (in `entity-coverage.util.ts`) includes `'dependencies'`, so the walker **descends into** the `dependencies` block — the model _believes it covers it_. But the extractor reads `dependencies` as a **bare-token list** (`tokenList`), and the `{ artillery = 1 }` assignment-form children yield nothing from `tokenOf` (an `Assignment` node hits its `default → undefined`). So the leaf `artillery` is not in the modeled set and surfaces as `dependencies.artillery`. **This is precisely the "worse finding" Job 2.4 names: an incomplete projection inside a modeled block, not a surface deliberately left alone.** It is also, deliberately, one of the three expected known drops.
- **`XOR` (uppercase) is a case-variant of a modeled key.** The model covers `xor` (lowercase, via `REF_LISTS.xor`); the case-sensitive `findBlock` match misses `XOR`. It surfaces as a **root-level** unmodeled key `XOR`, but semantically it is an **incomplete (case-sensitive) allow-list**, adjacent to a modeled surface — closer to the "worse" class than to a deliberately-unmodeled one.
- **`sub_technologies` is the only genuinely-unmodeled surface** of the three — a key nobody modeled, reported at root, subtree not descended.

**Honest limit:** the harness reports dotted key paths; it does **not** itself tag "inside a modeled region" vs "unmodeled surface." That classification is analytical, and I have done it above for the three _known_ keys from source. Whether BICE surfaces **other** keys of the `dependencies.<tech>` class (an incomplete allow-list nobody has noticed yet) is exactly what the real run exists to reveal, and it **cannot be answered in this session.** I will not claim "there are none" — that would be a confident wrong answer of the kind the ticket forbids.

### 2.5 — Mechanism of each known drop (code-level)

Traced from `libs/e-game-hoi4/src/technology/extract-technologies.util.ts` and the coverage adapters:

- `dependencies.<tech>` — extractor reads `dependencies` as `tokenList` (bare tokens only); assignment-form entries (`tech = 1`) produce no token. → drop.
- `sub_technologies` — not present in any `ROOT_KEYS`, `REF_LISTS`, or block handler. → drop.
- `XOR` — `REF_LISTS.xor = 'xor'`; `findBlock` matches case-sensitively; `XOR` ≠ `xor`. → drop.

### 2.1 / 2.2 — Per-entity ranked inventory

Not producible — requires the BICE set difference with real occurrence counts and `file:line` examples. The [fixture inventory](#fixture-inventory-evidence-only-not-bice) below shows the _shape_ of the output a real run would produce (twelve keys, count 1 each — synthetic), for reviewers unfamiliar with the report format. It is **not** a BICE inventory.

### 2.5 (classification) — by-design vs unintentional

Structurally (per ADR 021 and ADR 022 D7), the by-design-unmodeled classes are: lossless nested effect maps (technology's maps-of-maps), script/effect trees, and cross-entity ecosystem vocabularies. The **unintentional** class is the `dependencies.<tech>` incomplete projection and the `XOR` case-miss. A full, honest by-design-vs-unintentional split of _the BICE inventory_ cannot be produced without the inventory; I decline to guess it.

## Job 3 — Seed the baseline

**Not performed. Deliberately.**

Job 3 is gated on Jobs 1 and 2 completing against BICE, which they did not. Reseeding `coverage-baseline.json` from anything other than a real BICE run — the synthetic fixture, or worse, hand-authored counts — would be exactly the **"single largest unexamined widening"** this ticket's own preamble warns against at maximum severity, and exactly the "unexamined baseline widening silently readmits the class of drop the ratchet exists to catch" that ADR 023 records under Consequences. The current baseline (generated from the fixture in ZMT-23) is left **untouched**.

## Gate results (ticket "Gate" section)

| #   | Gate                                                                                      | Status                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ADR 022 gates 2 & 3 reported by name, with results                                        | **Done** — reported OUTSTANDING (see Job 1).                                                                                                           |
| 2   | Full coverage report in PR body and report file                                           | **Partial** — this file + PR body are the report; the _BICE_ inventory is unrunnable and is documented as such, not faked.                             |
| 3   | Unmodeled key inside a believed-modeled region called out prominently, or explicit "none" | **Done** — `dependencies.<tech>` called out with mechanism (Job 2.4); completeness over BICE flagged as unrunnable rather than answered "none."        |
| 4   | `coverage-baseline.json` regenerated from BICE and committed                              | **Not done** — no BICE run; reseeding would be an unexamined widening (Job 3).                                                                         |
| 5   | `verify` passes against the new baseline                                                  | **N/A** — no new baseline. Against the _current_ baseline, `verify` passes over the fixture (evidence only).                                           |
| 6   | Corpus immutability verified by hash                                                      | **Verified on the fixture run** (harness before/after hash). Vacuously satisfied for BICE — the corpus was never touched because it was never present. |
| 7   | Full suite green across all projects, unchanged                                           | **Green except the Electron-binary block** — see below. This ticket changes no `libs/`/`apps/` code, so no regression is introduced.                   |

### Gate 7 detail — full suite

- `zmt`: **136/136 pass.**
- `data-grounding` (harness self-tests): **28/28 pass** (the four drop classes, symbol exclusion, classification, baseline ratchet, corpus config, round-trip identity).
- All other projects: **pass.**
- `electron`: **131 test assertions pass; 2 spec files fail at import** (`workspace-handlers.setup.spec.ts` and one other) with _"Electron failed to install correctly"_ — the 403-blocked binary, **not** a logic regression. On a machine where the Electron binary installs, these load and pass.

## Environment probe (evidence the corpus is absent)

- `ZMT_GROUNDING_CORPUS`: unset.
- `tools/data-grounding/corpus.local.json`: absent (and gitignored by design).
- `.gitmodules`: none.
- On-disk BICE / `common/technologies` corpus: none (only in-repo synthetic fixtures under `tools/data-grounding/__fixtures__/` and parser fixtures under `libs/paradox-parser/**/__fixtures__/`).
- No setup/provision/download script; no mounted corpus volume.

## How to discharge this ticket (local run)

On a machine that holds the BICE fork and can run Electron:

```sh
# 1. Point the harness at the real corpus (env wins; or use corpus.local.json).
export ZMT_GROUNDING_CORPUS=/absolute/path/to/BICE

# 2. Gate 2 + coverage inventory (parse → serialize round-trip is exercised here).
nx run data-grounding:grounding      # verify against the current baseline

# 3. Gate 3 (write round-trip) requires the Electron runtime. Under the default
#    `node` runner it reports `blocked`; run the built harness under Electron, or
#    add an electron-based runner target, so `entity-mutation.service` can construct.

# 4. Only after Jobs 1 + 2 are reviewed: seed the baseline from the BICE run.
nx run data-grounding:update-baseline   # reviewable diff — Job 2 IS the review
```

Then paste the real report (`tools/data-grounding/last-report.md`) into the PR, replacing the fixture evidence here, and commit the regenerated `coverage-baseline.json`.

---

## Fixture inventory (evidence only, NOT BICE)

The harness run against the synthetic fixture, verbatim — included **solely** to show the report format and prove the instrument runs. Every count is 1 (synthetic). This is not a coverage inventory of any real mod.

| Entity       | Key path                 | Count | Example                                              |
| ------------ | ------------------------ | ----- | ---------------------------------------------------- |
| `character`  | `advisor.on_add`         | 1     | `common/characters/test_characters.txt:19`           |
| `character`  | `allowed_civil_war`      | 1     | `common/characters/test_characters.txt:23`           |
| `equipment`  | `resources`              | 1     | `common/units/equipment/test_equipment.txt:9`        |
| `ideology`   | `color`                  | 1     | `common/ideologies/test_ideologies.txt:13`           |
| `module`     | `can_convert_from`       | 1     | `common/units/equipment/modules/test_modules.txt:15` |
| `module`     | `gui`                    | 1     | `common/units/equipment/modules/test_modules.txt:12` |
| `state`      | `history.add_core_of`    | 1     | `history/states/test_state.txt:18`                   |
| `state`      | `history.victory_points` | 1     | `history/states/test_state.txt:19`                   |
| `technology` | `ai_will_do`             | 1     | `common/technologies/test_technologies.txt:31`       |
| `technology` | `dependencies.artillery` | 1     | `common/technologies/test_technologies.txt:29`       |
| `technology` | `sub_technologies`       | 1     | `common/technologies/test_technologies.txt:25`       |
| `technology` | `XOR`                    | 1     | `common/technologies/test_technologies.txt:22`       |
