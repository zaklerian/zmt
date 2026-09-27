# AI — rationale

Long-form reasoning for the rules in `.claude/rules/ai.md`, keyed by rule ID. Layout decision: ADR 005.

## AI-1 — Declared enforcement

A rule without a mechanism depends on being remembered, and agent memory is the least reliable layer. Declaring the mechanism for every rule shows at a glance which rules hold by construction and which rely on attention. The `DEBT:` note records what would make a review-only rule mechanical, which turns the rule file into a backlog of missing enforcement.

## AI-2 — Directive phrasing

A directive ("use X") changes what is generated; a filter ("avoid Y") lets the unwanted output appear and hopes it is removed. The one-line why lets the reader judge cases the rule did not anticipate. All-caps emphasis inflates urgency without adding information and weakens every rule that lacks it.

## AI-3 — Trigger text matches content

Skills load by their description, and path-scoped rules load by their `paths` frontmatter. When the body changes and the trigger does not, the right guidance fails to load, or the wrong one loads. Updating both in the same edit keeps them in step.

## AI-4 — Critique first

Agreement carries no information; critique does. Reviews should find where an assumption, design or rule is wrong. When nothing is, saying so plainly is the useful answer. Padding with validation hides the signal.

## AI-5 — Scoped agreement

Approval of one item is not approval of its neighbours. Treating it as such silently widens a change's scope and reverses decisions nobody revisited.

## AI-6 — Surface conflicts

When an instruction contradicts a rule, ADR or ledger line, acting on it silently reverses a recorded decision. Naming the conflict by ID or date and waiting for acknowledgement keeps reversals deliberate and recorded.

## AI-7 — Numbered questions

Numbered questions can be answered compactly ("Q1: A, Q2: B") and referred to later. Numbering that continues across the thread avoids two different "Q1"s.

## AI-8 — Delta-only prompts

Rules live in `.claude/rules` and load on their own. A prompt that restates a rule creates a second copy that drifts. Citing the ID points to the single source.

## AI-9 — Prompt sentence types

Every prompt sentence should change what the agent does. Rationale belongs in the chat around the prompt. Hedged statements ("there may be more") invite broad searches and false positives, so known facts are stated as facts. Open decisions are labelled options with criteria.

## AI-10 — Intent versus content

For implementation work, the agent writes the code against intent, rules and verification; pasting code into the prompt bypasses the rules and the agent's reading of the codebase. For documentation, the prose itself is the deliverable, so it is pasted verbatim.

## AI-11 — Prompt structure

A fixed structure makes omissions visible. Ending with Definition-of-Done commands makes verification part of the task and gives the Stop hook's checks a human-readable counterpart. Scope guards are added only where drift has been observed, because speculative guards are noise.

## AI-12 — Repo map in sync

`CLAUDE.md` is always loaded, so its repo map is the agent's first answer to "where does this go". A map that lags the workspace sends new code to the wrong place. Comparing it with `nx show projects` catches the lag.

## AI-13 — No comments from Claude Code

This is an instruction to Claude Code, not a ban on comments in the repository. Humans can still write comments. Names, types and structure carry intent; a comment an agent adds explains what the code already says, and it rots when the code changes. Type-escape comments (`@ts-expect-error`, `/// <reference>`) are included on purpose: an escape is a human decision.

The PreToolUse hook compares the text before and after the edit. For Edit and MultiEdit it compares `old_string` with `new_string`; for Write it compares with the file on disk when there is one. It blocks only comment lines that are newly added, so existing human comments near an edit never trigger it. It exits 2 and lists the offending lines.
