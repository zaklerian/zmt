// A technology node's icon sprite name, grounded against BICE (see
// docs/grounding/ZMT-44-icon-sprite-name.md, closing the icon half of ledger
// L-022). The rule is uniform across every node kind:
//
//   sprite = `GFX_<technologyToken>_medium`
//
// The token is the technology's own id; `GFX_` and `_medium` are literal. A wide
// (`enable_equipments`) node shows its OWN sprite, not the enabled equipment's
// picture — BICE establishes no distinct equipment-icon source (the equipment's
// `picture` is a separate production-UI sprite the tech tree never dereferences),
// so `nodeKind` drives the box, never the icon source. A token with no such sprite
// (the hidden generic roots, the `cv_*` subs) resolves `unresolved` downstream and
// drives the fallback — this util only names the sprite; the asset stack resolves it.
export function nodeIconSprite(token: string): string {
  return `GFX_${token}_medium`;
}
