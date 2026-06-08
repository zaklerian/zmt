# @paradox-parser

Cross-process parser for Paradox-script (the `.txt` / `.mod` / `.yml`
syntax used by HOI4, Victoria 3, and Stellaris). Process-neutral — runs
in renderer (via the eventual editor integration) and in main (via file
ops). No DOM, no Electron, no React dependencies.

## Status

The grammar, CST→AST adapter, serializer, trivia attribution, and dialect
flags are implemented; round-trip specs pass. The public `parse(source)`
function returns a `Script` AST node — it does not throw a stub. Dialect
configuration is wired through `ParseOptions.dialects` and consumed from
plugin `parserExtension`s via `dialectsFromPlugins`.

## Layout

Two top-level concern directories under `src/`:

```
src/
├── cst/   Lezer-facing layer. Owns the grammar source, the generated
│          LR parser, and any future dialect/external-tokenizer plumbing.
├── ast/   Public-API layer. Owns the typed discriminated-union AST,
│          the CST→AST adapter, and any future visitor / serializer
│          / trivia handling.
└── index.ts   Re-exports from ast/ only. cst/ stays internal.
```

**Layering rule (L3):** `ast/` may depend on `cst/`. `cst/` must never
depend on `ast/`. This keeps the typed AST surface insulated from the
Lezer-specific representation, so a future swap of the parser engine
touches `cst/` only.

## Grammar source

The single source of truth is `src/cst/paradox.grammar`. It is
version-controlled. The generated artifacts under
`src/cst/__generated__/` are **gitignored** and produced by the build.

## Build pipeline

Two phases on `nx build paradox-parser`:

1. **codegen** — `@lezer/generator` reads `src/cst/paradox.grammar` and
   emits `src/cst/__generated__/paradox.ts` (plus a `.terms.ts`
   companion file). The output location is gitignored; nothing
   generated is checked in.
2. **tsc** — `@nx/js:tsc` compiles `src/**/*.ts` (including the
   generated module) to `dist/libs/paradox-parser/`.

The `build` target declares `dependsOn: ["codegen", "^build"]` so the
ordering is enforced by Nx. Deleting `src/cst/__generated__/` and
rerunning `nx build paradox-parser` regenerates it cleanly.

`nx typecheck paradox-parser` runs `tsc --noEmit` and likewise depends
on `codegen`.

## Dependencies

- `@lezer/lr` — runtime LR parser (required at runtime).
- `@lezer/common` — shared CST types (required at runtime).
- `@lezer/generator` — codegen tool (devDependency only; not in the
  shipped artifact).

Pinned to exact `1.x` versions (`@lezer/common` 1.5.2, `@lezer/lr` 1.4.10)
per **R-CODE-3** (exact pinning, no caret/tilde) and **R-CODE-4**
(stability over recency). The 1.x line backs CodeMirror 6 and is widely
deployed.

## Public API (current scope)

- `parse(source: string, options?: ParseOptions): Script` — parses
  Paradox-script into the typed AST. `options.dialects` selects dialect
  flags (e.g. `hoi4_bracket_expr`).
- `serialize(root: Script, source: string): string` — round-trips the AST
  back to text, preserving trivia.
- `visit` — AST traversal over the discriminated-union node types.
- `dialectsFromPlugins` — collects dialect flags from plugin
  `parserExtension`s.
- `ParadoxNode` — the real discriminated union of AST node types
  (`Script`, `Assignment`, `Block`, value nodes, comments).

No editor integration (`@codemirror/*`) lives here. The parser is
independent of the editor; CodeMirror wiring lands with the editor
work in ZMT-S-1.
