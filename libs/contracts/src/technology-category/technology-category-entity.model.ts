// A declared technology category — the index's third entity type (ADR 024,
// ZMT-35). Its `id` IS the bare token declared under `technology_categories` in
// `common/technology_tags/*.txt`; a category carries nothing else. The picker (a
// later ticket) needs the token; a localised label comes from the loc layer, not
// from here. Distinct from the `categories` token list a `TechnologyEntity`
// references: this is the DECLARED vocabulary, read through the index so a
// category no technology currently uses is still offered.
export interface TechnologyCategoryEntity {
  readonly id: string;
}
