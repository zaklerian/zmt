// The slim projection of a declared technology category (ADR 024 decision 4):
// exactly the token an `index:list` row needs, nothing more. Identical in shape
// to the full entity today (a category has only its id), but kept as its own type
// so the two evolve independently — a later localised label would land on the
// slim row without necessarily changing the full entity. Provenance is NOT here;
// it rides the `IndexSlimRow` wrapper.
export interface TechnologyCategorySlim {
  readonly id: string;
}
