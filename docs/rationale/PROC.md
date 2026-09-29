# PROC — rationale

Long-form reasoning for the rules in `.claude/rules/proc.md`, keyed by rule ID. Cycle and states: `docs/sprint-protocol.md`.

## PROC-1 — Branch grammar

A branch named after its ticket makes branch → PR → commit → ticket traceable in both directions. The Claude Code hook blocks file edits on any other branch, so work cannot start on a harness-created or mistyped branch. A lefthook pre-push check covers humans once the toolchain lands. The grammar accepts numeric tickets, their subtasks and the `D<N><letter>` cleanup series; the first three cleanup tickets shipped from harness branches because the grammar was numeric-only, which is the `finding:d-series-ticket-grammar` recorded in the ledger and closed by widening the grammar in ZMT-A-D3c.

## PROC-2 — Commit grammar

The ticket ID as the first line anchors every commit to its decision. The five symbols summarise a change at a glance without a taxonomy of commit types. A commitlint plugin validates both parts at commit time.

## PROC-3 — One ticket, one PR

A PR that mixes tickets cannot be reviewed or reverted as one decision. Work discovered during planning becomes a subtask with its own ID and PR, shipped before its parent. Comparing the commit ticket with the branch ticket catches commits made on the wrong branch.

## PROC-4 — Verification before done

"Done" means the task's Definition-of-Done commands pass, not that the agent believes they would. The Stop hook runs the governance checks and then `nx affected -t lint typecheck test`. On failure it exits 2 and Claude Code keeps working. The hook reads `stop_hook_active` and exits 0 on a re-entry, so a persistent failure cannot loop.

## PROC-5 — ADRs

An ADR is warranted when a reasonable reviewer could ask "why not the other way?". Capping ADRs at 25 lines with Context, Decision and Consequences keeps them read rather than skimmed. Detail that does not fit belongs in the rationale docs, keyed by rule ID.

## PROC-6 — Ledger

One line per decision gives a chronological index of what was decided and where the reasoning lives. A deferral without a return condition becomes a silent rejection, so a deferred line names its `revisit:` trigger.

## PROC-7 — Sprint protocol

Planning happens in chat, and execution happens in one Claude Code session per task, driven by a prompt. The status line at every hand-off states the ticket's state and who holds the ball. Nothing waits on an ambiguous owner. This is review-only today. The planned mechanism is a prompt-type Stop hook asserting the line is present.

## PROC-8 — Retro format

Five fixed sections separate problems, neutral observations and strengths. Action items with an owner and a trigger turn each observation into a commitment that can be checked later. An item that appears in both Went Wrong and Keep Doing is a contradiction to resolve, not to record.

## PROC-9 — Codify recurring findings

A finding raised three times is a pattern, and reminders have already failed to stop it. It becomes a rule with a mechanism. High-cost defect classes, such as data loss or a boundary breach, become rules on first occurrence. The `finding:<slug>` tag on ledger lines lets the governance check count recurrences without human bookkeeping.

## PROC-10 — Commit shape

A change confined to one project and a handful of files reads well as one line. A change spanning projects or many files needs a symbol body so reviewers see its parts. The threshold is mechanical so the commit skill and commitlint agree.
