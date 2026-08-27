import { matchesTechnologySearch } from './tech-search.util';

export interface CanvasNodeEmphasis {
  readonly dimmed: boolean;
  readonly highlighted: boolean;
}

export interface CanvasNodeEmphasisInput {
  // The technology's own `categories` (the slim row's list), matched against the
  // categories the user selected from the declared vocabulary.
  readonly categories: readonly string[];
  readonly name: null | string;
  readonly search: string;
  readonly selectedCategories: ReadonlySet<string>;
  readonly token: string;
}

// Where search-highlight and category-dim compose (ZMT-54), decided once here
// rather than inside the node's styling.
//
// Neither signal REMOVES a node. Hiding a filtered-out technology would leave its
// edges dangling into empty space and break the readability of the tree the whole
// canvas is — so the filter dims in place, exactly as the search highlights in
// place (req 4). Layout is untouched by both.
//
// The composition rule: SEARCH WINS. A node the filter would dim but the query
// matched renders highlighted and undimmed — a hit the user cannot see is not a
// hit, and the query is the more recent, more specific intent.
//
// No categories selected = nothing dimmed. The filter narrows only once the user
// picks something.
export function resolveNodeEmphasis(
  input: CanvasNodeEmphasisInput,
): CanvasNodeEmphasis {
  const highlighted = matchesTechnologySearch(input.search, {
    name: input.name,
    token: input.token,
  });
  const inSelectedCategory =
    input.selectedCategories.size === 0 ||
    input.categories.some((category) => input.selectedCategories.has(category));

  return { dimmed: !inSelectedCategory && !highlighted, highlighted };
}
