# ADR 023 — Data-grounding harness and coverage baseline

- **Status**: Accepted
- **Date**: 2026-07-21

_The test suite proves a weaker property than it was trusted to prove. Round-trip byte-identity
shows we do not corrupt bytes we did not touch; it was being read as evidence we understood the
file. This records a gate that compares the file to the model instead of the model to itself. It
is additive to ADR 019 and ADR 022 and amends neither._

## Context

Serialization is a verbatim byte-slice (`source.slice(node.from, node.to)`), so a file
round-trips byte-identically **even when the AST has lost information about it**. The untouched
bytes are copied back untouched regardless of what the model learned from them. Round-trip
byte-identity proves _we do not corrupt bytes we did not touch_. It was being relied on as though
it proved _we understood the file_. Those are different claims, and everything in the space
between them is invisible to types, unit tests, and the round-trip gate **simultaneously** —
because in each case the model is internally consistent and simply **poorer than the source**.

Four such defects were found in a single grounding pass against one real mod, none of which any
existing gate could see:

| Dropped | Mechanism |
| --- | --- |
| `@NAME` substitution constants | sigil dropped by error recovery; value silently wrong in a modeled field (`folder.position`) |
| `dependencies = { tech = 1 }` | reader accepted only bare values; this form is what the real corpus overwhelmingly uses |
| `sub_technologies` | list dropped; sub-techs emitted positionless |
| uppercase `XOR` | case-sensitive match missed the variant the real data uses |

Every one of these is a **silent drop**: source information the model never learned. No assertion
in the repo could fail on any of them, because there was nothing to compare the model against
except itself. A test suite can prove properties of the model, and properties of the
transformation, but nothing in the repo compared **what the file says** against **what the model
knows**. The `@`-substitution drop is the same class of defect ADR 022 documents surviving a full
data-grounding sprint; it is evidence here, not a claim being reopened.

## Decision

**1. A data-grounding harness runs against a real mod corpus.** Parse → extract → write,
round-tripped over a **configured** mod root. The root is configuration, not a vendored fixture:
the harness points at a real mod on disk, and which mod is a matter of local setup.

**2. Its primary output is a coverage report, not a pass/fail.** For every entity block in the
corpus, the set difference between **keys present in the source** and **keys projected into the
model**. This set difference is the instrument: it is what would have caught all four drops above,
and it is the only artifact that compares the file to the model rather than the model to itself.

**3. Unmodeled keys are expected, so the report alone is not a gate.** Most unmodeled keys are
unmodeled deliberately — lossless-by-design effect blocks (ADR 021), script trees, ecosystem
vocabularies the editable surface intentionally leaves alone. Raw output is therefore noise, and
noise is not enforceable.

**4. A committed baseline turns the report into a ratchet.** The set of currently-known-unmodeled
keys is committed to the repo. The harness fails only when a key appears that is **not** in the
baseline. Widening the baseline is a deliberate, reviewable diff — an explicit statement that a
newly-seen key is intentionally unmodeled. This is approval testing, and it is the difference
between an instrument someone runs once and a gate that holds over time.

**5. The harness does not run in CI, and real mod data is not vendored.** It is a local pre-merge
gate: the regression gate of a ticket that touches the modeled surface names it, and its output is
pasted into the PR body. Two reasons, both recorded so neither reads as an oversight. Mod data is
third-party content the repo does not own. And a vendored excerpt is a snapshot that drifts from
the mod it was cut from, which reintroduces exactly the class of staleness this harness exists to
detect — a curated fixture would age into agreeing with the model while the real mod moved on.

**6. Enforcement is per-ticket, not a global rule.** Tickets that touch a parser, a grammar, an
extractor, or a contract name the harness in their regression gate. No new rule is added to
`.claude/`: rules shape reasoning distribution and each new one dilutes the signal of the existing
set, and this is a gate that specific tickets invoke, not a convention that governs all work.

**7. Corpus: the BICE mod fork**, already the ground-truth source used for entity data-grounding.
One real mod is sufficient to detect drops; broadening the corpus is deferred and is not a
precondition for the harness being useful.

This decision is additive to ADR 019 (the atomic write path the round-trip exercises) and ADR 022
(the `@`-substitution model whose outstanding real-corpus regression gates this harness is the
instrument for). Neither is amended; the harness observes both surfaces without changing either
contract.

## Consequences

**Positive**

- Silent drops become detectable for the first time. They are currently invisible to every gate
  in the repo at once — types, unit tests, and the round-trip gate — because in each case the
  model is internally consistent and merely poorer than the source.
- Foundational tickets gain a real data gate rather than an argument. **"Holds by construction" is
  not an acceptable disposition for a data-grounding gate** — that is precisely the reasoning that
  let the `@`-substitution drop survive a full sprint of data-grounding work (ADR 022). A gate this
  ADR names is satisfied by running it against a real mod and pasting the result, never by an
  argument that it must pass.

**Negative / accepted**

- The baseline is a maintained artifact: it grows deliberately, and a diff to it is a claim
  requiring review, not a mechanical update. An unexamined baseline widening silently readmits the
  class of drop the ratchet exists to catch.
- Because the harness is local, a PR can be green in CI and still have an unrun data gate. That is
  accepted, and it must be **visible in the PR body** rather than assumed — a green CI run is not
  evidence the harness was run.
- At least one change is already held pending this harness: its own regression gate cannot be
  discharged until the instrument exists. Foundational work that names a data gate now has
  somewhere to point.

## Alternatives considered

- **Vendor curated excerpts as CI fixtures.** Rejected. It runs everywhere, which is the
  attraction — and the trap: a vendored excerpt is a snapshot, it drifts from the mod it was cut
  from, and it would let "CI is green" be read as "it works against real mods," which is exactly
  the conflation this decision exists to prevent. A fixture that ages into agreeing with the model
  is worse than no fixture, because it looks like coverage.

- **Round-trip byte-identity as the sole data gate.** Rejected — this is the status quo, and it was
  green throughout all four defects above. It proves the transformation does not corrupt untouched
  bytes; it cannot prove the model learned what the file says, because a model that dropped a key
  still copies the untouched bytes back untouched.
