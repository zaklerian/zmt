# Sprint S-2 retro — ML entity-editing backbone

**Ticket:** ZMT-21 · **Sprint:** S-2 (closed) · **Date:** 2026-07-14

Follows the five-section `retro-format` skill. Round 1. Each finding traces to a
specific incident and is evidenced by a PR/commit/ADR/rule, or attributed to the
S-2 design sessions where the reasoning lived (those sessions are not in the repo;
the repo is the evidence for what they produced).

## What shipped (context, not a section)

Seven ML-editable entities grounded in real mod data: module, plane,
mod-descriptor, character, technology, state, ideology. A complete block palette
(prop-bag with open/known/freeSolo keys + `enum` + `boolean`; named-nested with
list-child and named-child facets; list-of-scalars; object-list with indexed
scope; keyed-object-map whose entry is a fixed template OR a prop-bag). One
atomic, lossless write path (scoped-delta batches, name+index scope segments,
item-surgical edits, batch-coordinated intermediate materialization — ADR 019).
The `add-entity-form-descriptor` skill. The three-doc navigation structure
(always-loaded project map with prescriptive golden references + ARCHITECTURE
narrative + point-in-time code map).

Sequence, by merge: ZMT-11 (form shell + descriptor registry, ADR 018, #48) → 12
(business-actions sweep, #49) → 13/13.1 (character + reachability + bare-token
writes, #50/#51) → 14 (technology object-list + indexed scope, ADR 021, #52) →
15/15.1 (state + numeric-key grammar + batch-coalesced materialization, #53/#54)
→ 17 (skill, #55… 2d8dcdc) → 18 (ideology + keyed-object-map editing, #56) →
19/20 (project map + doc refresh, ADR 020, #67/#68) → the pre-refactor
data-grounding reconciliation E14–E23. ZMT-16 (CodeMirror Paradox highlighting)
was deferred out of the sprint.

---

## 1. Went Wrong

**W-1 — Descriptors were grounded in assumptions, not data. This is the sprint's
central lesson: a miss the process failed to catch and a human found.** The form
descriptors were built from vanilla-game knowledge, wiki references, and code
surveys — never from the real mod's actual data. The surveys walked
parser → model → render → write and were rigorous at every layer, but never
opened a real mod file. They confirmed "the model supports shape X" without ever
asking whether X is what the data actually holds. It surfaced only when the human
first ran the app against a real mod (BICE) — the first human pass over the
shipped forms. Concrete consequences, each later corrected in the E14–E23
reconciliation:

- ideology subideology modeled as a fixed field `can_be_randomly_selected` that
  occurs zero times in real data, while its actual content (open modifier
  scalars) was hidden — dropped and re-modeled in **ZMT-E15** (`1c59be5`,
  ADR 018 amendment "keyed-map entry value may be a prop-bag").
- character `gender` field invented end-to-end with no backing data — shipped in
  **ZMT-13** (`82df16a`).
- state per-province buildings modeled in an inverted `naval_base = { province =
  level }` shape that is never populated — dropped for the province-id keyed map
  in **ZMT-E16** (`c2abfb9`).
- regular equipment labelled "Invalid" for lacking a signal it structurally
  cannot carry — changed to render "—" in **ZMT-E17** (`abf893f`).
- module cost maps (**ZMT-E20**, `13e0ab0`), advisor/ideology modifiers
  (**ZMT-E18/E19**, `abf6954`), ideology root fields (**ZMT-E19**) — all silently
  hidden until surfaced as open prop-bags.

**Structural cause, not a one-off:** the implementation agent never runs the
application — it has no Electron, no real mod folder. Every S-2 ticket's
verification was automated tests plus code review; no step put real data through
the real UI. Nothing in the process compensated for that blind spot, so
convention-based descriptors passed every gate the process had.

**W-2 — Forms shipped "done" that the real file could not reach.** Twice a form
was complete but unreachable. Character shipped in ZMT-13 with no read side and
was made reachable only in **ZMT-13.1** (`453e55b`: recognizer + `character:list`
channel + extraction + Edit-action). The mod-descriptor form was dead since
ZMT-11 because a real `.mod` file never opened it; fixed in **ZMT-E23**
(`97d1ded`: `.mod` recognized by file type, any location). "Reachable in-app" was
not part of the definition of done for an editable-entity ticket.

**W-3 — A blocker sat one layer below where the survey looked.** The parser could
not tokenize numeric assignment keys, which blocked state's province-keyed map
mid-implementation in ZMT-15. The survey had confirmed variable keys at the
model/render layer but never checked whether the parser could *tokenize* a
numeric key (ADR 019 amendment "numeric assignment keys in the parser grammar",
`b7b7513`). Confirming a layer is not confirming the stack.

**W-4 — Rule-of-three was misapplied to gate forward design.** It was read as a
reason to wait before building an editing capability to a known, stable,
design-certain requirement. A-PROJ-1 governs *post-hoc extraction* of
already-duplicated code, where waiting buys shape discovery — it does not gate
building to a certain requirement. The misread cost hesitation, not code.

---

## 2. Could Be Better

**C-1 — The correction arrived as a late sweep, not incrementally.** Because W-1
surfaced only on the first human run after the feature tickets closed, the fix
was a ten-ticket reconciliation batch (E14–E23) bolted on before the refactor,
rather than each descriptor being right when it shipped. The batch was clean, but
its existence is the symptom.

**C-2 — The two-features-one-shape insight came late.** Ideology subideologies
and state per-province buildings were scoped and estimated as two separate pieces
of renderer work (one requiring a nesting-cap lift) before they were recognized
as the same keyed-map-entry-of-flat-prop-bag structure. The generalization
(ZMT-E15) was correct but arrived during reconciliation; scoping them separately
was avoidable had the real data been read side by side up front.

**C-3 — ZMT-16 (CodeMirror Paradox highlighting) fell out of the sprint.** Not a
failure — a deliberate deferral — but it means the sprint's stated surface was
not fully delivered and the item now carries into S-3.

---

## 3. Good

**G-1 — The abstraction absorbed every shape.** Four entities with genuinely
different structures landed on the same form/write model with no contract break:
character (two-level portrait nesting + write-scope depth, ZMT-13), technology
(repeated same-name blocks → indexed scope addressing, ZMT-14), state (needed
nothing new, ZMT-15), ideology (needed an editing affordance on an existing
model, not a new value type, ZMT-18). The block palette and the scoped-delta
write contract (ADR 018/019) were designed up front and held under four diverse
real demands.

**G-2 — Two features turned out to be one shape, served by one generalization.**
Ideology subideologies and state per-province buildings are the same structure —
a keyed-map entry whose value is a flat prop-bag — so both were served by ONE
capability generalization (ZMT-E15, ADR 018 amendment) and the anticipated
nesting-cap lift evaporated. The generalizing insight came from reading the real
data side by side.

**G-3 — A structural rule replaced per-field judgment.** The editable/lossless
line is now structural: a FLAT open `key → scalar` map is an editable prop-bag;
nested maps-of-maps and script trees stay lossless. One predicate covers many
semantically-unrelated fields — modifiers, stats, costs, resources (ZMT-E19/E20)
— with no case-by-case call.

**G-4 — The implementation agent flagged rather than hid.** In ZMT-15 it
implemented to spec, then reported that the spec had a hole: two deltas
materializing the same absent parent block produce duplicate blocks. That
produced **ZMT-15.1** (`000fd55`) and the batch-coordinated materialization fix.
The "implement the spec, surface its gaps" prompt discipline worked as designed.

---

## 4. Keep Doing

**K-1 — Design the write contract up front.** The scoped-delta, atomic, lossless
write path (ADR 019) was specified before the first entity and absorbed grandchild
scope, indexed positional addressing, bare-token list items, and coalesced
materialization as amendments — never a rewrite. Keep designing the load-bearing
contract ahead of the features that stress it.

**K-2 — Amend ADRs in place, indexed.** ADR 018 took four amendments and 019 took
five, each recorded as a dated section and surfaced in the ADR-INDEX amendments
table. The decision record never lagged the code. Keep this hygiene.

**K-3 — Fold a blocker's prerequisite into the running ticket with a regression
gate.** The numeric-key parser blocker (W-3) was fixed inside ZMT-15 rather than
halting to isolate a prerequisite ticket, with a mandatory round-trip regression
gate as the safety substitute for isolation. Isolation stays the exception,
reserved for genuinely high-blast-radius foundational changes.

**K-4 — Golden references must themselves be clean.** A prescriptive exemplar
("copy this") is only safe if it carries no flaw — a copied flaw propagates. This
shaped the project map (ZMT-19), where `module` is named the entity exemplar
precisely because it is the clean, complete slice. Keep demoting an exemplar the
moment a cleaner instance exists (R-WORK-15).

---

## 5. Action Items

| # | Observation | Commitment | Owner | Trigger |
|---|-------------|------------|-------|---------|
| A-1 | W-1 | Fork the real mod (BICE) into the repo as fixtures so descriptors can be authored and verified against actual data. | Denys + CC | Before the first S-3 descriptor ticket (bucket-A/B sweep). |
| A-2 | W-1, W-3 | Extend the survey stack to walk DATA (parser → model → render → write → **data**); a descriptor must be grounded in real mod data, not convention. Encode in the `add-entity-form-descriptor` skill. | rule-or-doc (skill) | Next edit to the descriptor skill; before S-3 descriptor work. |
| A-3 | W-1 | Add a manual verification step to editable-entity ticket verification: real data through the real UI. Only the human can run the app, so this is a human gate, backed by a checklist over the shipped surface. | Denys | Next editable-entity ticket. |
| A-4 | W-1 | **Proposed rule (needs decision):** "A form descriptor is grounded in real mod data, never in convention, wiki, or code survey alone." R-WORK-7's defect/process-rule exception permits first-occurrence codification when recurrence cost is high; W-1 is exactly that. Do not add speculatively — decide in S-3 planning whether it lands in PROGRAMMING (R-PROJ) or stays skill-scoped. | planner | S-3 planning. |
| A-5 | W-2 | Reachability is part of "done": an editable-entity ticket carries its own recognizer + `entity:list` channel + extraction + Edit wiring unless an existing read side already lists it. Already reflected in the `add-entity-form-descriptor` skill's reachability step — confirm it is stated as a done-gate, not a suggestion. | rule-or-doc (skill) | Next descriptor skill edit. |
| A-6 | W-4 | Record the rule-of-three calibration next to A-PROJ-1: it governs post-hoc extraction of already-duplicated code (waiting buys shape discovery); it does NOT gate building to a known, stable, design-certain requirement. Test: recurrence design-certain AND shape stable → build now; shape uncertain or recurrence guessed → wait. | rule-or-doc | S-3 planning; note against A-PROJ-1. |
| A-7 | Roadmap / L-005 | Confirm and close L-005 (the YAGNI save baseline — no optimistic updates, no state library). Seven entities saved through it without pain, so it likely closes by YAGNI. | Denys | Next planning round; closure trigger already "at first save flow" (met). |
| A-8 | C-3 | Carry the open items into S-3 planning: the refactor (held, scope undecided); ZMT-16 (CodeMirror Paradox highlighting); the bucket-A/B descriptor sweep and bucket-C deeper maps (idea container, MIO). | planner | S-3 planning. |

---

## Pollution check (plain-mode pass)

Per the skill: a pass over the repo as if the design-session context did not
exist, cross-referenced against the sections above. Items the design narrative did
not foreground but the repo surfaces, listed for the user to decide whether they
belong in the retro:

- **ZMT-12 — the business-actions sweep** (`0797b2a`): Save/Cancel/Browse/Close
  and add-mod migrated onto the ADR-015 availability-driven action pattern,
  removing a duplicated inline presence conditional. A real S-2 deliverable not
  covered by the ML-backbone narrative above. Worth a Keep-Doing note (the action
  pattern held) if the user wants it.
- **ADR 021 — technology's intentionally thin editable surface**: ZMT-14 scoped
  technology to root scalars + object-lists and left the ecosystem untouched. A
  deliberate scope-limiting decision that is arguably a G-item (scoped honestly
  rather than over-modeled) — not in the design material supplied.
- **ZMT-E13 — module-domain removal** (`27b6b55`) and **ZMT-E10 — parser trivia
  attribution O(n²) → O(n log n)** (`a113aa2`): both landed in the E-series window
  adjacent to S-2. If either is inside the S-2 boundary they belong in the record;
  the design material did not mention them. Flagged for the user to place.

These are surfaced, not asserted into the sections — Round 1's coverage stands as
above unless the user pulls one in.

---

*Round 1 complete. Subsequent rounds happen only if these results are
unsatisfactory and are initiated explicitly (per `retro-format`).*
