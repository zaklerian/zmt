---
name: retro-format
description: >
  Use this skill whenever the user initiates a retrospective for any
  process review. Triggers: "let's do a retro", "retrospective for ZMT-X",
  "retro this", "what went well and wrong", or any framing that asks for
  structured process reflection. The skill enforces the five-section
  format, multi-round protocol, action items requirement, and
  conflict-checking rules agreed for this project. Always apply this
  skill for retros even if the request sounds casual.
---

# Retro format

## Sections per round

Every round has five sections in order:

1. **Went Wrong** — actual problems, friction, recurring failures.
2. **Could Be Better** — neutral observations on suboptimal-but-
   functional patterns.
3. **Good** — what worked.
4. **Keep Doing** — patterns worth preserving.
5. **Action Items** — explicit commitments tied to observations.

Each action item carries:

- Observation reference (which line it came from)
- Owner (Denys / planner / CC / rule-or-doc / scheduled task)
- Trigger (when does this get done)

## Rounds

Round 1 is mandatory. Subsequent rounds happen only if Round 1's
results are unsatisfactory. The user initiates additional rounds
explicitly.

## Cross-section overlap

An item appearing in two sections is acceptable. Note the overlap
once; do not fight it.

## Conflict check

Push back only when an item appears in both Went Wrong AND Keep Doing.
That contradiction needs resolution, not papering-over.

## Pollution check

After Round 1 draft, run a plain-mode pass: analyze the codebase as if
the chat context did not exist. Cross-reference findings against
Round 1 claimed coverage. Items the chat missed are listed for the
user to decide on. This surfaces chat-context bias.

Q-format applies in retros as in every other chat per R-WORK-6 — no
retro-specific phrasing needed.
