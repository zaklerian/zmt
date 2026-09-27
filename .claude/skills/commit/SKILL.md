---
name: commit
description: Write and create a ZMT git commit — ticket-ID first line, symbol-prefixed body (+ - * ~ !), Option A single line or Option B multi-line body by change breadth. Use whenever committing work in this repo, when asked to "commit", "write the commit message", or at the end of a task. Never pushes.
---

# Commit

Rules: PROC-1, PROC-2, PROC-3, PROC-10.

1. Confirm the branch is `dev/ZMT-A-<N>` or `hotfix/ZMT-A-<N>`; the ticket ID in the message equals the branch's (PROC-3).
2. Review the staged set: `git status`, `git diff --cached --stat`.
3. Choose the shape (PROC-10):
   - **Option B** (multi-line body) when the change touches more than one Nx project or top-level area (`apps/<x>`, `libs/<x>`, `docs`, `.claude`, `tools`), or more than five files.
   - **Option A** (the ticket ID alone on a single line) otherwise.
4. Message grammar (PROC-2):
   ```
   ZMT-A-<N>
   + added thing
   - removed thing
   * changed thing
   ~ fixed thing
   ! breaking change
   ```
   First line is the ticket ID alone. One body line per logical change, present tense, no trailing period.
5. Append the commit trailers the session requires after a blank line.
6. Commit with a heredoc so symbols survive the shell: `git commit -F - <<'MSG' … MSG`.
7. Do not push from this skill; pushing the ticket branch and opening the PR are the task's finish steps, and `main` is never pushed (ADR 005). End with the status line from `docs/sprint-protocol.md`.
