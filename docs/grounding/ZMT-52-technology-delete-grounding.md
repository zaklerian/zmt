# ZMT-52 — Technology delete — grounding report

- **Ticket**: ZMT-52 — Delete technology (baseline)
- **Date**: 2026-08-19
- **ADR**: 027 (write boundary, D3 batch + D4 delta kinds + D5 editable-owner routing), 028 (edit model, D4/D5 shared by delete). Feeds ledger `L-011` (delete as a second cascade trigger) and `L-024`.
- **Corpus**: BICE at `/home/user/test-mod-bice`. Never vendored; never modified.
- **Files read**: every `common/technologies/*.txt` (2 670 technology blocks) and every `localisation/english/*.yml`.

## Headline

The three shapes this ticket's fixtures had to match — how many technologies share
a file, whether a folder's technologies span files, and which loc keys a deleted
technology actually owns — are all read from BICE rather than assumed. Two of the
three contradict the shape a delete would naively be built for.

## Finding 1 — same-file multi-delete is the COMMON case, not the edge case

All **35** technologies whose first `folder` is `air_techs_folder` — the canvas's
own folder — live in **one file**, `common/technologies/air_techs.txt`.

A delete-tree there is therefore N deletions against ONE file for every N > 1, and
`assertOneOperationPerFile` (ADR 027) rejects N operations on one path by design.
This is why the AST write operation gains an **ordered per-file delta list** this
ticket, the same shape the loc operation has carried since ZMT-48 — not a
special case bolted on for a rare tree, but the shape the canvas's only folder
demands on its first non-leaf delete.

Measured delete-tree sizes under the ticket's traversal rule, folder-scoped:
`generic_fighter` → **14**, `early_fighter` → **13**, `jet_fighter1` → **1** (leaf).

## Finding 2 — a folder's technologies DO span files, so the cascade is multi-file

`air_techs_folder` does not span files, but `tank_techs_folder` does: **280**
technologies across **12** files (`armor_techs.txt` plus eleven per-nation
`armor_techs_*.txt`). Of BICE's 33 folders it is the only multi-file one today.

So both shapes are real and the batch must handle both: one operation per file,
each carrying that file's ordered deletions. The gate-4 fixture is authored to the
`tank_techs_folder` shape (a folder spread over two `.txt`) rather than to
`air_techs_folder`'s single file.

Note the near-miss that is NOT a counter-example: `tech_air_engine_jet`
(`electronic_mechanical_engineering.txt`) declares **ten** `folder` blocks, one of
them `air_techs_folder`. Folder membership reads the **first** folder exactly as
`projectTechnologySlim` does, so it belongs to `electronics_folder` and the air
folder's count stays 35. Reading it any other way would make the canvas's row
filter and the delete plan disagree about the same technology.

## Finding 3 — the deleted set usually owns NO loc key at all

**None** of the 35 `air_techs_folder` technologies has a BICE localisation key —
their display names come from vanilla localisation, absent from the workspace
(the same fact ZMT-50's grounding §4 recorded for the edit path). A delete on the
canvas's own folder is therefore **script-only**: the loc half of the batch is
empty, not a no-op write.

The loc half is not dead code, though. In `armor_techs.txt` +
`armor_techs_GER.txt`, **53 of 57** technologies own an editable BICE name key
(mostly `trm_research_l_english.yml`, some `bi_mio_l_english.yml`), and the key
set spans **two files** — so a delete-tree's loc deletions group by owning file
the same way its script deletions do. Versions vary: `:0` is typical,
`bi_mio_l_english.yml` carries versionless `KEY:` lines. A delete does not read
the version, so both forms are removed identically.

ADR 028 D4's autogen-vs-custom pivot is **moot on delete** (recorded on `L-024`):
the token is removed outright, so both token states drop the same keys — the name
key `<token>` plus `_desc` / `_short` where present.

## Finding 4 — `dependencies` is live in the corpus, and it points UPSTREAM

**826 of 2 670** technologies carry a non-empty `dependencies` block, so the ref
kind is not vestigial. Inside `air_techs_folder` it nearly is: 34 of the 35
technologies have every `dependencies` entry commented out, and the one live
block — `jet_fighter1` — names `tech_air_engine_jet` and `jet_aircraft_prototype`,
**both in `electronics_folder`**, so the folder scope alone stops the traversal
there.

The direction, however, is the divergence this ticket carries to the PR rather
than resolving: `path.leads_to_tech` names a **successor**, `dependencies` names a
**prerequisite**. The ticket defines a delete-tree as the closure over both as
"outbound" edges, which walks downstream along `path` and **upstream** along
`dependencies`. Implemented as specified (the count is shown before the user
confirms); raised as Q94 in the PR body.

## Finding 5 — nothing outside the air folder references into it

Scanning all 2 670 technologies: **zero** technologies outside `air_techs_folder`
name one inside it via `leads_to_tech` or `dependencies`. The inbound warning is
therefore silent on the PoC folder in the shipped corpus — which is exactly why it
is computed **server-side over the whole workspace** and specced against an
authored fixture instead of being trusted to fire on BICE.
