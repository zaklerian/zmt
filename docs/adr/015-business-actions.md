# ADR 015 — Business actions: availability-driven interaction pattern

- **Status**: Accepted
- **Date**: 2026-06-09

## Correction (2026-07-13) — first consumer

The original text named the tree context menu as the first consumer. That surface was
designed but never built — the file tree has selection, expansion, and a double-click
expand/collapse toggle only, no context menu. The **realized** first consumer is the
**entity-table toolbar** (`EntityTableToolbar` in
`apps/zmt/src/features/mod-content/components/entity-table.component.tsx`), which renders the
actions available for the selected entity row. This corrects the first-consumer statement in
_Scope_ below; the decision itself is unchanged — the availability-driven pattern holds
identically for a toolbar host.

## Context

User-triggerable interactions recur across the renderer — saving and discarding in settings, switching locale, opening a folder, confirming a dialog, and now removing a mod from the project via a tree context menu. Each was implemented ad hoc: a handler wired directly to a control, with the control's presence and enablement decided by inline conditionals at the call site. Two costs compound as interactions multiply:

1. **Presentation logic scatters.** "Should this control show / be enabled for this target?" is answered by bespoke conditionals next to each control. A surface that hosts several interactions (a context menu, later a toolbar or command palette) must hardcode which interactions apply to what — a growing switch over target kinds.
2. **Execution couples to a fixed parameter list.** Handlers take pre-extracted fields. Adding a field an interaction needs ripples through signatures, and the handler depends on the caller having extracted exactly the right inputs.

A surface that hosts a variable set of interactions needs to ask each interaction whether it applies, rather than encode the mapping itself.

## Decision

Model every user-triggerable interaction as a **business action**: a self-contained object exposing its own availability, presentation, and execution.

```ts
interface Action<Context> {
  id: string;
  label: (context: Context) => string;
  isAvailable: (context: Context) => boolean;
  execute: (context: Context) => void | Promise<void>;
}
```

- **Availability is the action's own concern.** A hosting surface renders the actions for which `isAvailable(context)` returns true — it does not switch over target kinds. Unconditional actions return `true`. Surface content is thus _derived from action availability_, never from a kind-switch in the surface.
- **The context is an entity, not a parameter list.** `execute` and `isAvailable` receive a context object describing the target and the capabilities needed to act on it; each action reads only the slice it needs. Adding a field to the context does not change any action's signature, and an action requiring a new field reads it without a contract change. This is Dependency Inversion (surface depends on the action abstraction; actions depend on the context abstraction; neither on the other's internals) and Interface Segregation (each action consumes only its slice of the context).
- **The execute contract is minimal.** `execute` may be sync or async and is otherwise unconstrained. Action-specific sequencing — confirmation prompts, routing, interruption, optimistic updates — lives inside that action's `execute`, not in the abstraction. The abstraction does not grow to accommodate one action's needs.

### Location

The `Action` abstraction is a shared renderer surface (it is the contract every consumer depends on). Concrete actions are owned by the feature that defines the interaction; they are not centralized until a shared implementation home is independently earned. The abstraction being general does not pull implementations into a shared location.

### Scope

This is the general pattern for any renderer interaction. The realized first consumer is the entity-table toolbar (its content is the set of actions available for the selected entity row); see the Correction note above — the tree context menu named here originally was designed but never built. Existing ad-hoc interactions are migrated to it incrementally; the pattern is recognized across them, not invented for one surface.

### Presentation

The base `Action` carries `label` (the action's own user-facing name, universal to every visual surface and owned as i18n copy) but no icon or other surface-specific decoration. Icons and similar are resolved by the hosting surface, or by a surface-specific extension of `Action`, so the base contract stays free of any particular icon system and non-visual consumers carry no decorative fields.

## Consequences

**Positive**

- A hosting surface (menu, toolbar, command palette) is a dumb renderer of available actions — adding an action is registering an object, not editing the surface.
- Availability, label, and execution for one interaction are colocated and testable in isolation.
- Context-as-entity decouples action signatures from the caller's field extraction; the action set can evolve without rippling parameter lists.
- The same action object is reusable across surfaces (a "remove" action works identically in a menu, a button, or a palette).

**Negative / accepted**

- Indirection: a one-off interaction is heavier as an action object than as an inline handler. Accepted because interactions are not one-off here — the recurrence is the motivation.
- A context object must carry enough for every action that reads it; designing the context is a small upfront cost per surface.
- Migration of existing ad-hoc interactions is incremental work, not a single cutover.

## Alternatives considered

- **Kind-switch in the hosting surface** (the surface decides which interactions apply per target kind). Rejected — the mapping lives in the wrong place, grows with every interaction, and a reviewer adding an action must edit the surface. The availability-on-the-action model is the inversion of this.
- **Handlers taking explicit parameter lists.** Rejected — couples each handler to the caller's extraction and ripples signatures when needs change. Context-as-entity is the SOLID-aligned alternative.
- **Baking sequencing (confirm/route/interrupt) into the abstraction.** Rejected — generalizes one action's special case onto all actions. Sequencing stays inside the action that needs it; the abstraction stays naive.
- **Icon or other surface decoration on the base abstraction.** Rejected — surface-conditional presentation on a universal contract forces non-visual and icon-less consumers to carry meaningless fields and couples the contract to an icon system. Surfaces resolve decoration, or extend the abstraction.
- **Centralizing all concrete actions in one location immediately.** Rejected — actions are owned by the feature defining the interaction; a shared implementation home is earned independently, not assumed because the pattern is general.
