# ADR 007 — File classification model

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

The renderer needs to know whether to disable a file in the tree, render it as a
preview, or eventually edit it. Three states:

- A file ZMT can edit (text/yaml/mod/html files)
- A file ZMT can preview but never edit (images)
- A file ZMT does not handle (anything else)

Three problems must be solved:

1. **Where does the policy live?** Renderer, contracts, or main?
2. **What shape does the answer take?** Boolean flag, enum, free-form string?
3. **How does the policy evolve when paired-library games ship file handlers?**

## Decision

### Shape — three-state enum, const object + derived union

```ts
// libs/contracts/src/fs/file-support.const.ts
export const FILE_SUPPORT = {
  editable: 'editable',
  readonly: 'readonly',
  unsupported: 'unsupported',
} as const satisfies Record<string, string>;

export type FileSupport = (typeof FILE_SUPPORT)[keyof typeof FILE_SUPPORT];
```

Modern TS idiom over `enum`: no runtime reverse-mapping table, plays cleanly with
`--isolatedModules`, `satisfies` validates shape without widening.

### Where the policy lives — main process

```ts
// apps/electron/src/main/fs/classify-file.util.ts
export function classifyFile(extension: string | null): FileSupport {
  if (extension === null) return FILE_SUPPORT.unsupported;
  if (EDITABLE_EXTENSIONS.has(extension)) return FILE_SUPPORT.editable;
  if (READONLY_EXTENSIONS.has(extension)) return FILE_SUPPORT.readonly;
  return FILE_SUPPORT.unsupported;
}
```

Backed by a structured catalog with per-bucket sub-groupings for readability:

```ts
// apps/electron/src/main/fs/default-file-classification.const.ts
export const DEFAULT_FILE_CLASSIFICATION = {
  editable: {
    data: ['.yaml', '.yml', '.mod'],
    html: ['.htm', '.html'],
    text: ['.txt', '.md', '.info'],
  },
  readonly: {
    image: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'],
  },
} as const satisfies {
  editable: Record<string, readonly string[]>;
  readonly: Record<string, readonly string[]>;
};
```

The classifier function is called once per file when main builds `FsNode` during
directory listing. The renderer receives `FsNode.support` already computed.

### Plugin evolution — later

When an `e-game-{x}` library contributes file-handler additions, `classifyFile`
walks both the default catalog and registered contributions. Main emits an
`fs:invalidate` IPC event when contributions change; the renderer refetches visible
directories.

## Consequences

**Positive**

- Single source of truth for "what is supported"; renderer never reimplements
- Three-state enum lets the renderer differentiate behavior at a glance
- Adding plugin support later requires editing one file (`classifyFile`); the
  renderer doesn't change
- The catalog's nested grouping (text/data/html/image) is purely for human
  readability — no runtime meaning, no contract impact

**Negative**

- Renderer can't filter the catalog itself (e.g., "show me only YAML files"); would
  require a contracts-side derived type if needed later. Not a current need.

## Alternatives considered

- **Boolean `supported` flag** — rejected. Two states can't differentiate
  "editable later" from "preview only." We'd be back to a string-based "kind" field
  to disambiguate, which is just the enum reinvented.
- **Classifier in renderer** — rejected. The renderer would need access to the
  extension list, which is filesystem policy, not UI concern. The boundary becomes
  blurry: a paired-library contribution in main adds file support, but the renderer
  doesn't know unless contracts synchronize the list.
- **`enum FileSupport` (TypeScript enum)** — rejected. Runtime reverse-mapping table
  for numeric enums, `--isolatedModules` friction, less ergonomic with structural
  typing. The const-object pattern subsumes the use cases without the cost.
- **Directories also classified by content** — rejected. Directories are always
  `readonly` (navigate, don't edit structure). A fourth state for "navigable" would
  duplicate the readonly semantics without adding behavior.
