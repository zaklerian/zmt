---
name: add-plugin-contribution
description: >
  Use this skill whenever the user asks to add a new contribution kind
  to the plugin system per ADR 010. Triggers: "let plugins contribute
  X", "add a schema/parser extension/locale/component contribution to
  GamePlugin", "extend the plugin contract with Y", or any request that
  modifies GamePlugin in libs/contracts or RendererPlugin in
  libs/r-game-*. The skill points at three existing contribution
  exemplars (schemas, parser extensions, locale resources) and walks
  through the cross-process trust boundary decisions. Always apply
  this skill for plugin contract work.
---

# Add plugin contribution

Three contributions already exist as exemplars; the fourth follows the
same shape. Decide per-contribution: does this live on the
cross-process `GamePlugin` (in `@contracts`) or the renderer-side
`RendererPlugin` (in `libs/r-game-*`)?

## Decision rule

- Lives on `GamePlugin` (`@contracts`) if main needs to know about it.
  Examples: schemas (main may validate); parser extensions (parser is
  cross-process).
- Lives on `RendererPlugin` (`libs/r-game-*`) if it is renderer-only
  data. Examples: locale resources, React components, UI feature
  toggles' display state.

When in doubt: does main have any reason to see this data? If no,
keep it renderer-side. The main process does not ship user-facing
strings, React components, or styling.

## Exemplars

1. **Schemas.** `libs/contracts/src/plugin/game-plugin.model.ts`
   `modDescriptorSchemaExtension` field. Cross-process; typed as
   `Readonly<Record<string, unknown>>` to keep `@contracts` free of
   schema-library deps. Renderer casts to the schema-library shape at
   the call site where Zod is imported.

2. **Parser extensions.** `libs/contracts/src/plugin/parser-extension.model.ts`
   declarative config object. Wired in HOI4 via
   `libs/e-game-hoi4/src/hoi4-plugin.const.ts`.

3. **Locale resources.** `libs/r-game-hoi4/src/renderer-plugin.model.ts`
   `localeResources` field (renderer-side only). Aggregated at app
   boot via `apps/zmt/src/i18n/register-plugin-namespaces.ts`.

## Shape

Every contribution is OPTIONAL on its host interface. Existing plugins
without the new contribution compile unchanged. New contributions ship as empty values (`{}`, empty array) to exercise the
contract end-to-end without committing to real content. This is the
throwing-stub / empty-namespace pattern proven across multiple
contribution kinds.

## Verify

- HOI4 plugin compiles with the new optional field unset
- HOI4 plugin compiles with an empty value for the new field
- `nx affected -t typecheck build` is green
- If renderer-side: the aggregation function (analogous to
  `registerPluginNamespaces`) handles empty plugins without throwing

## Rule references

ADR 010, R-TS-4, R-ELECTRON-2.
