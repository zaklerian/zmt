// Loc-key derivation for a technology token, grounded against BICE (ledger
// `L-023`, report in `docs/grounding/ZMT-50-technology-loc-grounding.md`).
//
// The NAME key is exactly `<token>` — no prefix, no suffix; 2 408 of 2 670 BICE
// technology tokens resolve to a loc key of their own name
// (` air_superiority:0 "Air Superiority"`, `research_l_english.yml:547`).
// The derived keys are `<token>_desc` (1 557 of 2 670 — OPTIONAL: the Commonwealth
// air techs carry a name key and no description) and `<token>_short` (24 of 2 670,
// all naval-hull techs). No other suffix reaches materiality.
//
// Derived keys are listed so an autogen rename MOVES them rather than orphaning
// them: leaving `<old>_desc` behind is the same defect as leaving `<old>` behind.
// Each is moved only when it is actually present, never conjured.

const DERIVED_SUFFIXES = ['_desc', '_short'] as const;

// Every loc key a technology may own, name key first. Order is load-bearing: the
// name key is the one the form edits; the rest ride the rename.
export function technologyLocKeys(token: string): readonly string[] {
  return [token, ...DERIVED_SUFFIXES.map((suffix) => `${token}${suffix}`)];
}

// The name key — the single key the public-name field reads and writes.
export function technologyNameLocKey(token: string): string {
  return token;
}
