# ADR 010 — Paired-library architecture per game

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

The paired `e-game-{x}` / `r-game-{x}` library pattern is an internal architectural
discipline mechanism, not a contract with external plugin developers. The "plugin"
terminology names the discipline of treating each game as if it were external code,
not a deliverable for outside contributors. This presumed-external stance is what
enforces the layer separation — host code cannot reach into game-specific concerns
and game code cannot leak into the host.

Registration is build-time. `KNOWN_PLUGINS` and `KNOWN_RENDERER_PLUGINS` are static
arrays compiled into the bundle. Adding a game requires editing those arrays and
building the project. There is no plugin manifest, no dynamic loading, no filesystem
discovery, no installation flow. The "extensibility" the pattern provides is for the
single author adding the next game, not for end users installing third-party content.

ZMT targets HOI4, Victoria 3, and Stellaris. HOI4 is the only game built today; `v3`
and `stellaris` are reserved `gameId`s in `GAME_IDS` with no libraries yet. Each game
defines its own entities (traits, units, focuses, buildings, technologies) with
game-specific shapes, file paths, and validation rules. The architecture must
accommodate these without letting any one game's specifics leak into shared host code.

Three concrete problems the pattern solves:

1. How does a game register itself with the app?
2. Where do game-specific schemas, file ops, and UI components live in the
   workspace?
3. How are per-game features represented and persisted independently?

## Decision

### Pairing — main + renderer per game

Each supported game ships as a pair of Nx libraries:

```
libs/e-game-{gameId}/   electron-main side
libs/r-game-{gameId}/   renderer side
```

Naming follows ADR 009's taxonomy. The `e-game-{x}` library owns Zod schemas, file
ops, IPC handlers, validation, and parsing for that game's mod files. The
`r-game-{x}` library owns forms, list views, and entity components rendered into
host-provided slots. The host renderer (`apps/zmt`) provides slots and orchestration;
the per-game pair fills them. Per-game libraries do not import from each other.

A schema-only approach with a generic host renderer would blur the boundary — the
host would own UI logic that conceptually belongs to the per-game library. The
full-stack pair makes the boundary visible in the workspace graph: `nx graph` shows
where game-specific code lives, and the dependency direction enforces "host calls
into game, never the reverse."

Cost accepted: two libraries per game. Acceptable because the workspace-graph
enforcement value exceeds the file-count cost.

### Per-game export shape — declarative static object

Each `e-game-{x}` library exports:

```ts
const HOI4_DIALECTS: readonly ParadoxDialect[] = ['hoi4_bracket_expr'];

export const HOI4_PLUGIN: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [
    {
      enabled: false,
      featureId: FEATURE_IDS.traits,
      label: 'Traits',
    },
  ],
  gameId: GAME_IDS.hoi4,
  modDescriptorSchemaExtension: HOI4_MOD_DESCRIPTOR_SCHEMA_EXTENSION,
  parserExtension: {
    dialects: HOI4_DIALECTS,
  },
};
```

Each `r-game-{x}` library exports a parallel `rendererPlugin` with feature
components keyed by feature id.

A factory variant — `createPlugin(host): GamePlugin` — was rejected.
Registration-time host context is not needed; if it ever is, the factory can be
added as a secondary export without breaking the static shape.

### Feature toggle granularity — per-game per-feature

Features enable/disable independently per game. "Traits ON for Stellaris" and
"Traits OFF for HOI4" are independently representable states. There is no
app-global feature toggle that overrides per-game settings.

### Persistence — per-game keyed entries, save-on-action

User-data storage (electron-store) holds plugin settings as separate keyed
entries per game:

```
pluginSettings.hoi4      = { features: { traits: true, focuses: false, ... } }
pluginSettings.v3        = { features: { ... } }
pluginSettings.stellaris = { features: { ... } }
```

Behavior:

- Switching the active game in the UI does NOT write to storage. It changes which
  entry is being viewed and edited.
- Form edits stay in form state until the user hits Save. No auto-save.
- Save writes only the active game's entry. Other games' entries are untouched.

This isolates per-game state explicitly. A bug in HOI4's settings cannot silently
corrupt V3's settings.

### Contribution kinds

The `GamePlugin` shape (in `@contracts`) declares the following optional
contributions:

- `metadata` — gameId, displayName
- `features` — list of `FeatureContribution { featureId, label, enabled }`
- `modDescriptorSchemaExtension?` — a `Readonly<Record<string, unknown>>` Zod
  raw-shape carried opaquely so `@contracts` stays free of schema-library deps. The
  renderer casts it to a `ZodRawShape` at the call site (`resolveSchemaForPlugin` →
  `baseModDescriptorSchema.extend` → `zodResolver`). Today HOI4 ships the
  empty-namespace stub (`{}`); it is the only schema contribution that exists.
- `parserExtension?` — declarative dialect / external-tokenizer config consumed by
  `@paradox-parser` via `dialectsFromPlugins`.

Renderer-side only (on `RendererPlugin`, not in `@contracts`):

- `localeResources` — i18n namespaces keyed by `plugin.<gameId>`.

Future (not yet wired; tracked here so the contract isn't mistaken for present):

- `fileClassification` additions per ADR 007 — ADR 007 ships only the default branch;
  no `GamePlugin.fileClassification` field exists yet.
- Per-feature entity schemas keyed by `featureId` — entity schemas live in their
  `e-game-{x}` libraries; no `GamePlugin.schemas` map exists yet.

## Consequences

**Positive**

- Per-game boundary is visible in the workspace graph
- Each game's logic is colocated, easy to remove, easy to audit
- Per-game persistence is corruption-isolated by construction
- Schemas live next to the file ops that produce them — no cross-library
  schema drift
- The discipline of "treat games as if external" prevents the host from special-casing
  any single game

**Negative**

- Two libraries per game means more bookkeeping per supported game
- The discriminated-union approach at IPC boundaries means host code that routes
  generically must do exhaustive checks; the type system enforces this but it's
  friction the schema-only approach would have avoided

## Alternatives considered

- **Schema-only library with generic renderer** — rejected. Blurs the boundary; the
  host ends up owning UI behavior that conceptually belongs to the per-game library.
  Saves files now, costs clarity later.
- **Single contracts library namespacing per-game schemas** — rejected. Makes
  `@contracts` grow unboundedly with every supported game; each new game would force
  a contracts edit. Per-game libs decouple this.
- **Factory export — `createPlugin(host)`** — rejected. Registration-time host
  context is not needed today. YAGNI; static export is enough.
- **Per-feature global toggle (one switch for "Traits" applies to all games)** —
  rejected. Each game has different feature surfaces; per-game-per-feature matches
  the actual mental model of working in one game at a time.
- **Auto-save on toggle change** — rejected. Makes accidental clicks immediately
  persistent. Save button is explicit and undoable until clicked.
- **Runtime plugin registration (manifest + dynamic loading)** — rejected outright.
  The architecture is internal discipline, not extensibility. Runtime registration
  would add untrusted-code sandboxing, marketplace concepts, and installation flow
  for zero current benefit. If a future use case emerges (untrusted plugins,
  end-user-installable mods of the modding tool), that's a separate ADR.
