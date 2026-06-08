# ADR 011 — Form library: React Hook Form + Zod

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Every feature beyond the descriptor edit involves forms: mod-info edit, entity
create/edit across HOI4/V3/Stellaris, tech tree node edit, related-model linking,
custom variable declaration. The decisions made here ripple through all of them.

Forms in the React ecosystem require choosing along two axes:

1. Form state management (uncontrolled refs, controlled state, hybrid)
2. Schema validation (Yup, Zod, Joi, ad-hoc, none)

The form state choice determines re-render frequency and ergonomics. The schema
choice determines what validation looks like, how errors are typed, and whether
the schema can double as a runtime guard at IPC boundaries.

## Decision

Use React Hook Form (RHF) for form state, Zod for schema definition and
validation, and `@hookform/resolvers/zod` to bridge them.

### Why RHF over Formik or controlled useState

RHF uses refs (uncontrolled by default) and subscribes only the components that
care about a given field's state. A 50-field form re-renders the input the user
is typing in, not the other 49.

Formik triggers full-form re-renders on every keystroke. At ZMT's scale (a unit
edit form can have 30-60 fields including modifier rows), this becomes visible.

Hand-rolled `useState` per field is fine for two or three fields. Past that,
the boilerplate around dirty tracking, validation timing, and error display
becomes the feature, not the form.

### Why Zod over Yup or hand-written validators

Zod schemas double as TypeScript types via `z.infer<typeof Schema>`. One
declaration produces both the runtime check and the static type. No drift.

Yup's TypeScript inference is weaker and historically lags. Hand-written
validators force a parallel type declaration plus a parallel validator, with
nothing tying them together — the exact drift problem the contracts library
exists to prevent (ADR 001).

Zod schemas are also the natural shape for per-game schema contributions
(ADR 010): each `e-game-{x}` lib exports schemas, the renderer consumes them via
`zodResolver(schema)`. No additional adapter layer.

### Integration shape with ADR 010

Each `e-game-{x}` library exports Zod schemas keyed by feature id. The
renderer's form components read the active game from state, look up the schema
for the feature being edited, and pass it to RHF:

```ts
const schema = resolveSchemaForPlugin(plugin);
const form = useForm({ resolver: zodResolver(schema) });
```

Per-feature schema lookup keyed by `featureId` is future work; today only the
mod-descriptor schema extension is wired.

The form component does not know which game it's editing. Game-specific
behavior is in the schema (validation rules) and in the field-rendering
components shipped by the corresponding `r-game-{x}` lib.

This is the host/per-game-library split from ADR 010 made concrete: host owns
form infrastructure, per-game library owns schemas and field components.
