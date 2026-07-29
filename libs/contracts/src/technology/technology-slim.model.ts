// Derived by signal, not a lookup table (ADR 024 / Q7): `sub` when the entity has
// no own position (a `sub_technologies` member the engine attaches to its
// parent), else `wide` when it declares `enable_equipments`, else `simple`.
export type TechnologyNodeKind = 'simple' | 'sub' | 'wide';

// Resolved node coordinates. Numbers, not raw tokens: the symbol model already
// resolves `@`-var coordinates to literals upstream (ADR 022).
export interface TechnologyPosition {
  readonly x: number;
  readonly y: number;
}

// The slim projection of a technology — exactly what a tech-tree canvas node and
// its edges need without an `index:detail` call, nothing more (ADR 024 decision
// 4). Provenance and source detail are NOT here: they ride the `IndexSlimRow`
// wrapper and the companion `SourcesTable`. The node label is the token for now;
// the localised name needs the loc layer (a later ticket), so slim carries the
// token, not a display name.
export interface TechnologySlim {
  readonly categories: readonly string[];
  // Undrawn AND-edges (`dependencies`) — a distinct list from `pathTargets`.
  readonly dependencyTargets: readonly string[];
  // The resolution token, i.e. the node id.
  readonly id: string;
  readonly nodeKind: TechnologyNodeKind;
  // Drawn OR-edges (`path.leads_to_tech`).
  readonly pathTargets: readonly string[];
  // Resolved canvas coordinates (any `@`-var already lowered to its literal by
  // the symbol model). Null when the entity declares no own position — which is
  // exactly the `sub` signal: a sub-technology carries no folder/position, the
  // engine attaches it to its parent. Distinct from `startYear`; `position.y` is
  // a layout coordinate, not a year.
  readonly position: null | TechnologyPosition;
  // Distinct from `position.y`; the `start_year` scalar, null when omitted.
  readonly startYear: null | number;
}
