// The committed baseline turns the raw coverage report into a ratchet (ADR 023
// decision 4): the harness fails only on an unmodeled key absent from this file.
// Widening it is a deliberate, reviewable diff — a statement that a newly-seen key
// is intentionally unmodeled. The shape is optimised for that review: entity type
// → key path → a first-sighting `file:line` and an occurrence count, so a diff
// reads as "this key, here, N times", the context a reviewer needs to judge intent.
// The `count`/`example` are informational (the corpus is configuration and differs
// between machines); the ratchet compares the SET of (entityType, keyPath) only.
export interface BaselineEntry {
  readonly count: number;
  readonly example: string;
}

export interface BaselineKeyRef {
  readonly entityType: string;
  readonly keyPath: string;
}

export interface CoverageBaseline {
  readonly entities: Readonly<
    Record<string, Readonly<Record<string, BaselineEntry>>>
  >;
  readonly note: string;
}
