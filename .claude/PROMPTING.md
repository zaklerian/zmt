# Working rules — prompting

Rules covering how CC-targeted prompts are generated. BASE.md covers chat-level collaboration. PROGRAMMING.md covers code. PREFERENCES.md overrides any item by ID.

CC prompts are addressed to CC, not the user. CC loads BASE.md, PROGRAMMING.md, PROMPTING.md, and PREFERENCES.md at session init. Project rules do not need re-stating inside the prompt body; reference rule IDs when they apply.

## Conventions

- `R-PROMPT-{N}` — invariant rule.
- `A-PROMPT-{N}` — default approach.
- Numbers scoped to this file.

---

## R-PROMPT — generating prompts

**R-PROMPT-1.** Every sentence inside the prompt body is one of:

- An imperative ("Do X", "Apply at these three sites")
- A constraint ("No new dependencies", "Behavior unchanged")
- A specification (file paths, rule IDs, content to paste)
- A verification step
- A scope guard preventing a specific known failure mode

Content that explains decisions, rationalizes choices, or speaks to the user goes in chat prose alongside the prompt, not inside the prompt body.

**R-PROMPT-2.** Prompts state what is known and decided. Resolved decisions appear as instructions. Genuine context-dependent decisions — where the answer depends on what CC discovers during execution — are written as labeled options (A/B) with selection criteria. Known counts and known sites appear by name; "audit X, list findings, do not act before confirming" is reserved for cases where discovery is genuinely needed. Hedge language ("there may be more", "likely contains", "probably has 2+ methods") invites broad search and false positives.

**R-PROMPT-3.** Documentation prompts paste content verbatim per R-WORK-12. Implementation prompts describe intent — files to touch, shape requirements, behavior requirements, rules that apply, verification steps. The implementation source itself is never in the prompt.

**R-PROMPT-4.** Reference project rules by ID. CC has them loaded; cite the ID at the relevant step. Re-state rule content only when the rule itself is the deliverable.

---

## A-PROMPT — default approaches

**A-PROMPT-1.** Prompt structure: goal, numbered steps, constraints, applicable rules, verification, commit body, PR title. Each step has a title and is self-contained.

**A-PROMPT-2.** Include a scope guard for a specific dimension only when CC has actually drifted on that dimension before. Speculative scope guards add noise.

**A-PROMPT-3.** Split commit bodies along natural seams for review readability. Single-commit form is acceptable if preferred by the operator; the split is a suggestion, not a constraint.
