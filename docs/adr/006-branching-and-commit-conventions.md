# ADR 006 — Branching, commits, and PR conventions

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Source control conventions are the lowest-cost, highest-leverage tool for keeping a
codebase's history readable and traceable. Decisions made here ripple into every code
review, every changelog, and every "why did we do this six months ago" investigation.

## Decision

### Branches

Two patterns only:

- `dev/ZMT-N` — feature work
- `hotfix/ZMT-N` — production fix

No `feat/`, `chore/`, `bug/`, `docs/` proliferation — at this team size, two
categories is the right ceiling.

### Main is protected

Direct pushes to `main` are blocked. Code reaches main only through pull requests
that pass CI. Two layers enforce this:

- **Client-side** — `.claude/hooks/check-branch-name.sh` rejects commits/pushes on
  any branch that is not `dev/ZMT-*` or `hotfix/ZMT-*` (R-PROJ-1); CI re-runs the
  full gate on every PR against `main`.
- **Server-side** — a GitHub ruleset on `main`: require a pull request, require the
  `ci` status check, require branches up to date, require linear history, no admin
  bypass. GitHub enforces branch protection on public repositories at no cost, so the
  ruleset is active once the repo is public. While the repo was private on the Free
  plan the ruleset was configured but unenforced — client-side hook + CI carried the
  discipline.

### Commit and PR messages

**First line: the ticket ID.** Always.

**Body: symbol-prefixed lines** describing what changed:

| Symbol | Meaning         |
| ------ | --------------- |
| `+`    | added           |
| `-`    | removed         |
| `*`    | changed         |
| `~`    | fixed           |
| `!`    | breaking change |

`!` is reserved for breaking changes only, matching Conventional Commits. `~` is used
for fixes to avoid the conflict.

Example:

```
ZMT-N
+ fs.openFolderDialog / getCurrentRoot / listDirectory / searchFiles channels
+ FsNode contract with FileSupport tri-state enum
+ structured IpcError serialization round-trip
+ MUI mini drawer with full hide
+ features/mod-content with controlled tree component
* renamed file-tree → mod-content (feature naming by domain noun)
```

### Commit cadence

- **Option A — one commit per change.** Single-line message. Multiple independent
  changes should be reviewable / revertible individually.
- **Option B — multi-line body.** Use when one logical change touches several pieces.

Squash-merge to main either way; the final main commit message is the curated
record of what landed.

## Changelog generation (future)

When automated changelogs land, the generator will read the ticket ID from each
commit and pull stakeholder-facing copy from a dedicated JIRA custom field
(falling back to the ticket title). Separates engineering history
(developer-written, in commits) from stakeholder communication (PO-written, on
the ticket). Open question for that work: policy for commits without tickets
and tickets spanning multiple releases — both deferred.

## CI workflow alignment

GitHub Actions triggers align with this convention:

```yaml
on:
  push:
    branches: ['dev/**', 'hotfix/**'] # CI runs on every feature-branch push
  pull_request:
    branches: [main] # CI re-runs as the merge gate
```

Main receives no `push` trigger because main receives no direct pushes.

## Consequences

**Positive**

- Branch → PR → commit → ticket is bidirectionally greppable
- History stays scannable at any zoom level (single commit, PR, branch, release)
- Master is structurally protected, not just by convention
- Future automation has a stable data shape to read from

**Negative**

- Engineers must remember to include the ticket ID
- The custom symbol set requires a written legend (provided in CONTRIBUTING.md)

## Alternatives considered

- **Conventional Commits** (`feat:`, `fix:`, `chore:`...) — rejected. Forces every
  change into a predefined taxonomy; at this team size, the bookkeeping cost exceeds
  the tooling benefit. Auto-changelog generation will instead rely on JIRA fields,
  which the PO already owns.
- **Free-form commit messages** — rejected. Loses the at-a-glance scan value and the
  ticket-traceability anchor.
- **GitFlow** (`feature/`, `release/`, `develop`) — rejected. Overweight for a single
  long-lived branch (`main`) with no scheduled releases yet.
