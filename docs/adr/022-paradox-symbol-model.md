# ADR 022 — Paradox `@` substitution-symbol model

- **Status**: Accepted
- **Date**: 2026-07-14

_The `@` sigil carries three unrelated Paradox syntaxes; two are handled and one —
substitution constants — is silently dropped by the parser's error recovery. This records the
model that makes a substitution reference a first-class value while keeping serialization a
verbatim byte-slice. It is additive to ADR 019 and ADR 020 and amends neither._

## Context

The `@` sigil is overloaded across three syntaxes that share nothing but the character:

| Syntax                          | Meaning                                            | Handling before this ticket (ZMT-E24)                |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `@NAME = 2` / `y = @NAME`       | substitution constant — definition and reference, resolved at load | **not tokenized; the sigil is dropped by error recovery** |
| `@[ expr ]`                     | bracket arithmetic                                 | tokenized as `BracketExpression`, gated by the `hoi4_bracket_expr` dialect — correct |
| `variable@token`                | runtime dynamic indexing (e.g. `ai_variant_level@fighter_equipment`) | **also broken**: recovers as `variable` (Identifier) + an error token for `@` + a spurious `token = …` assignment — NOT a single Identifier |

**Correction (ZMT-E24).** An earlier draft of this table asserted `variable@token`
"lexes as a plain `Identifier` — correct". That was an unverified inference, and it was
wrong: the `Identifier` rule `$[A-Za-z_] $[A-Za-z0-9_]*` never admitted `@`, so the
interior `@` recovered as an error token and split the run into a spurious assignment. This
is the same category of mistake the section below names — a passing test read as "we
understood the file" — reproduced in this document's own prose. **Two silent parse defects
are fixed by ZMT-E24, not one:** the dropped substitution sigil AND the split of interior-`@`
identifiers. The implementation makes the "single Identifier" claim true (interior `@` is
admitted into the `Identifier` token); it does not preserve a behaviour that already held.

Two of the three syntaxes were mishandled — substitution constants (silently dropped) and
`variable@token` (split with an error token) — and the construct is not technology-specific:
it appears throughout `common/`. In `common/technologies` alone the substitution form is
**1,827 definitions and 5,351 use-sites across 46 files**, the most-used symbol carrying 258
use-sites.

**What the parser does today (verified against `libs/paradox-parser/src/cst/paradox.grammar`,
`libs/e-game-hoi4/src/technology/extract-technologies.util.ts`, and
`apps/electron/src/main/fs/entity-mutation.service.ts`).** The grammar's `Identifier` rule is
`$[A-Za-z_] $[A-Za-z0-9_]*` — it does not admit `@`, and the only `@`-bearing token is
`@[ … ]` under the `hoi4_bracket_expr` dialect. A leading `@` in reference position therefore
matches no token and is discarded by error recovery, leaving the following literal behind:

- `y = @1933` parses with **zero errors**; the value node is `NumberValue raw="1933"`.
  `extractTechnologies` (via `rawValueOf` → `NumberValue.raw`) yields `{ key: 'y', value: '1933' }`.
- `x = @FTR_START` parses with zero errors; the value node is `Identifier name="FTR_START"`.
  The extractor yields `{ key: 'x', value: 'FTR_START' }`.
- `@1933 = 2` (the definition form) records one error token, since `@` in key position cannot
  be recovered as cleanly; the key becomes `Identifier "1933"`.

The consequence is visible to the user. `technology-form-descriptor.ts` projects
`folder.position.x` / `.y` straight from these extracted scalars, so a grid coordinate authored
as `@1933` is displayed as the number **1933** — a coordinate rendered as a year. Worse,
`entity-mutation.service` splices the delta-supplied literal over the value node's byte range
(`from = node.value.from`, `to = node.value.to`) and never inspects the old value; saving a
changed position replaces `@1933` with a bare literal and the symbol is **destroyed**.

**Why this survived a full data-grounding pass.** Round-trip specs pass throughout, because
serialization is a verbatim byte-slice (`source.slice(node.from, node.to)`). A file whose AST
has already lost the sigil still round-trips byte-identically: the untouched bytes are copied
back untouched. The round-trip test guarantees "bytes we did not touch are unchanged"; it was
being read as "we understood the file." Those are not the same claim, and the gap between them
is where this defect lived.

**The scope question.** Symbol-resolution scope could not be verified against the game's
documentation — the HOI4 wiki is unreachable from the tooling environment. The available
evidence is the mod fixture itself: each symbol is **re-defined in every file that uses it**
(`@1936 = 4` in most air files, `@1936 = 8` in `GER_air.txt`), and **genuine cross-file uses
are zero** across all 46 files. If resolution were global-with-last-wins, the mod's own tech
tree would be misplaced by four grid rows wherever a later file's redefinition won. File-scope
is therefore adopted as an **assumption**, recorded as such with an explicit invalidation
trigger (below), not asserted as fact.

## Decision

Model a substitution reference as a first-class value whose resolved literal is what the form
sees and whose symbolic origin is preserved for the one consumer that needs it.

1. **Grammar.** A dedicated token for substitution constants, in both definition (`@NAME = …`)
   and reference (`… = @NAME`) forms. It must not collide with `@[ expr ]` — the new token
   matches `@` followed immediately by a name character, so it never claims `@[` (the next
   char is `[`), which stays the dialect-gated bracket-expression token. It must also not
   split `variable@token`: because the pre-ticket `Identifier` rule excluded `@`, that run was
   NOT a single identifier (it recovered as `variable` + an error token + a spurious
   assignment — see the Context correction). This ticket admits `@` as an interior identifier
   character (`$[A-Za-z_] $[A-Za-z0-9_@]*`), so `variable@token` lexes as one `Identifier`; the
   sigil is significant **only in leading position**, where the new substitution token claims
   it and `Identifier`, which never starts with `@`, does not.

2. **AST.** The reference node carries the symbol name (sigil stripped) and the verbatim source
   byte range. The AST does **not** lose the `@`. Serialization remains a verbatim byte-slice;
   losslessness is unchanged.

3. **Resolution.** A **per-file** symbol table, built at parse time. Definitions in a file
   populate that file's table; references resolve against that table only. Not lazy, not
   global, not cross-file. This is the file-scope assumption from the scope question above,
   encoded in the resolver rather than left as a comment.

4. **Contract.** `EntityField` (in `libs/contracts/src/entity/`) gains one **optional**
   property, `symbol?: { name: string }`. `value` continues to carry the **resolved** value, so
   every existing reader that reads `value` is unaffected and only the one consumer that cares
   about symbolic origin reads `symbol`. The two rejected shapes are recorded under Alternatives.

5. **An unresolved reference is a parse diagnostic**, not a silent fallback. This is the
   file-scope assumption of decision 3 expressed as a runtime assertion rather than a comment:
   if the engine's real rule turns out to be global, the application says so the first time a
   real mod depends on cross-file resolution, instead of silently resolving wrong. The
   assumption's **invalidation trigger** is precisely this diagnostic firing on a mod that loads
   correctly in-game — that observation reopens decision 3 in favour of a wider scope.

6. **Writes emit literals, and say so.** Changing a symbolic field writes a literal and breaks
   the binding **at that call site**. This is deliberate and bounded: the scoped-delta model
   (ADR 019) never rewrites untouched fields, so a symbol dies only where the user actually
   edited it, never wholesale. What is not acceptable is doing it silently — the form warns
   before saving, naming the symbol being replaced and the literal replacing it. The defect this
   ADR fixes is the silence, not the write. Symbol **management** — add / edit / delete, and
   inlining a symbol's last value at every call site on delete — is a separate decision, not
   this one.

7. **A symbol definition is a declaration, not an entity field.** A definition (`@x = 1`)
   parses to a distinct `SymbolDefinition` key node and is **never** projected into a field —
   by **any** reader. The guarantee is enforced by the node kind: a single shared skip
   (`isSymbolDefinition`) sits at the point where each reader consumes a scalar leaf (its
   `fieldOf` projection and its modeled-key lookups), so a definition cannot become a field
   regardless of where it is written or what it is named. The fixed-allow-list vs. open-key-space
   distinction (technology's `ROOT_KEYS` / `POSITION_KEYS` vs. the `module` / `state` /
   `character` / `ideology` prop-bags) explains only *why the open readers were the visible
   risk* — it is **not** the basis of correctness. "Immune by construction" for a fixed reader
   was true only observationally: the reader was safe because a symbol name happened not to
   collide with a modeled key, not because it refused definitions. That is immunity by
   coincidence, and it fails on a real collision path — `@`-var names are frequently numeric
   (`@1933`) and position keys are numeric, so `@10 = 5` written at a scope a fixed reader scans
   would project as a field with no test able to see it. The invariant must not depend on names
   never colliding: no reader projects a `SymbolDefinition`, full stop.

This decision is additive to ADR 019 (the write path it relies on) and ADR 020 (the read-side
recognizer registry): neither is amended. The optional `symbol` field rides the existing
`EntityField` through both without changing their contracts.

## Consequences

**Positive**

- Positional data for technology becomes correct for the first time on any file using
  `@`-vars: `folder.position` resolves to the real grid coordinate instead of rendering the
  symbol's incidental numeric name.
- `EntityField.symbol` is optional and additive. No existing descriptor, delta-util, or form
  changes — the seven shipped entities compile and behave unchanged, and only the save-time
  warning reads the new field.
- The per-file symbol table is the natural home for a future symbol editor and for
  inline-on-delete (a multi-site rewrite bounded to one file), so the mechanism this decision
  introduces is the same one those features will extend.
- A symbol definition can never leak into an editable field (decision 7): the `SymbolDefinition`
  node kind makes "declaration, not field" a structural property enforced by one shared skip at
  every reader's scalar-consumption point, so EVERY extractor — fixed-allow-list and
  open-key-space alike — rejects definitions by construction rather than by relying on symbol
  names never colliding with a modeled key.

**Negative / accepted**

- Parse diagnostics currently have **no surfacing path** in the UI. The unresolved-reference
  diagnostic of decision 5 is therefore not yet observable to a user; a diagnostic-surfacing
  channel is a separate change and a **prerequisite** for decision 5 to do its job. Until it
  lands, the assertion protects correctness internally but is invisible.
- A symbolic field edited through the form loses its binding at that site, by design (decision
  6). The bound is the edited call site only; the warning is the mitigation, not a prevention.

**Deliberately excluded, recorded so the omission does not read as oversight**

- `%` / `%%` percent literals and `rgb` / `hsv` keyword-tuple blocks are **also** absent from
  the grammar. They occur only in `.gui`, break nothing that ships, and are out of scope here;
  they belong to whichever decision models `.gui`, not to the `@`-symbol model.

## Alternatives considered

- **Model `value` as a discriminated union** (`{ kind: 'literal' } | { kind: 'symbol' }`).
  Type-honest — it makes the illegal "symbolic value read as a plain literal" state
  unrepresentable. Rejected: it would force a mechanical rewrite of seven entities' delta-utils
  and form descriptors to carry information the optional field already carries. Exactly one
  consumer needs to know a value was symbolic (the save-time warning), and the one that must
  **not** is the form, which wants the resolved number. Making illegal states unrepresentable is
  a heuristic, not a law; here the union costs more than it earns.

- **An external symbol table keyed by file + byte offset**, leaving `EntityField` untouched.
  Keeps the contract pristine, at the cost of a coupling — value-to-symbol association living
  outside the value — that no future reader will think to look for. Rejected: the optional field
  puts the association where the value is, which is where a reader expects it.

## Regression gate

This is a foundational change to the parser beneath all seven shipped entities. The
implementation ships only when:

1. Every existing parser, extractor, delta-util, form-descriptor, and write-service spec is
   green and **unchanged**.
2. Round-trip byte-identity through parse → serialize on the real corpus. **Cannot be run in
   this repo: no `common/technologies/*.txt` corpus is vendored** (the grounding pass ran
   against external data). The in-repo fixture proves the grammar handles the constructs
   losslessly — NOT that the fix holds across the real corpus. This gate stays an outstanding
   verification, to be run against a real mod, and must not be reported as satisfied by a
   "holds by construction" argument — that is precisely the reasoning that let the original
   defect survive a full data-grounding sprint (see Context).
3. An unmodified write through `entity-mutation.service` is byte-identical on the real corpus.
   Same limitation as gate 2: not runnable in-repo; the in-repo fixture exercises an unmodified
   write for byte-identity, the real corpus does not exist here. Outstanding.
4. A technology whose source is `position = { x = @FTR_START y = @1933 }` extracts with `x` =
   the resolved value and `symbol.name = "FTR_START"`, and `y` = the resolved value and
   `symbol.name = "1933"`.
5. Specs prove `variable@token` lexes as a single `Identifier`, and `@[ expr ]` behaviour is
   unchanged. (The earlier "`variable@token` unchanged" wording was self-contradictory:
   satisfying it literally would have meant preserving the split-with-error-token bug — see the
   Context correction.)
6. A reference with no same-file definition produces a diagnostic.
7. NO extractor projects a field for a `SymbolDefinition`, whether the definition sits at file
   root or inside a block. Covered for the open-key-space readers (`module`, `state`,
   `character`, `ideology`) and — critically, since "immune by construction" is rejected — for a
   fixed-allow-list reader: `@10 = 5` inside a `position` block projects no `x`/`y` field.
