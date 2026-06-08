# ADR 005 — File naming and suffix conventions

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

File names carry information. A reader scanning a folder should be able to tell what
each file contains before opening it. When files of unrelated kinds sit in the same
folder without a marker, the only way to know what each file is is to open it. That
cost compounds at scale.

## Decision

Every source file carries a suffix that names the artifact kind. The folder names the
collection or domain; the suffix names the individual artifact inside it.

### Suffix catalogue

| Suffix           | Contains                                         | Runtime? |
| ---------------- | ------------------------------------------------ | -------- |
| `.model.ts`      | Types, interfaces — pure type definitions        | No       |
| `.const.ts`      | Constants, lookup tables, static data            | Yes      |
| `.service.ts`    | Stateful logic, side effects, IPC seams          | Yes      |
| `.util.ts`       | Pure stateless helpers                           | Yes      |
| `.component.tsx` | React component                                  | Yes      |
| `.hook.ts`       | React hook                                       | Yes      |
| `.factory.ts`    | Constructs and returns an object                 | Yes      |
| `.setup.ts`      | Wires up app-level state (handlers, sessions, …) | Yes      |

### Folder organization — two patterns

**Domain folders — mixed artifact kinds, suffixes disambiguate.** Used for renderer
feature code and the contracts library:

```
libs/contracts/src/fs/
├── file-support.const.ts
├── fs-node.model.ts
└── ipc-error.model.ts
```

**Collection folders — single artifact kind, suffix labels the kind.** Used for
main-process plumbing:

```
apps/electron/src/main/factories/
└── create-main-window.factory.ts

apps/electron/src/main/setup/
├── install-csp.setup.ts
└── system-handlers.setup.ts
```

The suffix is partially redundant with the folder name in this pattern. The trade-off
accepted: a uniform convention across the codebase is worth more than minimizing
redundancy in plumbing folders. A grep across the workspace for `*.factory.ts` finds
every factory.

### Folder organization — domain over artifact kind for non-plumbing code

Group by subject domain inside libraries and feature areas:

```
libs/contracts/src/
├── api/                        # domain
├── fs/                         # domain
└── ipc/                        # domain
```

Not by artifact kind. Domain grouping colocates files that change together. Collection
grouping in plumbing code is a deliberate exception because the files there aren't
tied to a domain — they're the same kind of operation applied to different parts of
the app.

## Naming style

- **Files**: `kebab-case` — `system-handlers.setup.ts`, `app-api.model.ts`
- **Folders**: `kebab-case`. Singular when the folder names a domain (`api/`, `ipc/`),
  plural when it names a collection of peers (`apps/`, `libs/`, `factories/`)
- **Exports**: `PascalCase` for types and components, `camelCase` for functions,
  `SCREAMING_SNAKE_CASE` for runtime constants

## Consequences

**Positive**

- Every file announces what kind of artifact it is from its name alone
- A workspace-wide grep finds every artifact of a given kind in one query
- Reviewers learn the suffix vocabulary once and apply it everywhere

**Negative**

- Suffixes are slightly redundant in collection folders (`factories/*.factory.ts`)
- Two folder-organization patterns to recognize (domain vs collection); reviewers
  occasionally need to decide which pattern a new folder should follow

## Alternatives considered

- **No suffixes in main-process plumbing** — defensible: in `factories/`, every file
  is a factory. Rejected because the consistency benefit outweighed the redundancy.
- **No suffixes anywhere, folder names alone disambiguate** — rejected. Domain
  folders contain multiple artifact kinds; the suffix is the only disambiguator.
- **`.types.ts` instead of `.model.ts`** — rejected for consistency with existing
  code. Either works; the codebase committed to `.model.ts` first.
- **`.container.tsx` / `.view.tsx` for React smart/dumb split** — rejected. Container/view classification was forcing upfront decisions for
  marginal value at this project scale.
