// The canvas search predicate (ZMT-54). A technology is addressable by two names
// and the search matches BOTH: its TOKEN (what the node label carries today) and
// its PUBLIC NAME (the localised name the user actually thinks in, resolved
// through the loc layer). Either alone misses half of how a technology is looked
// for — the token is what the files say, the name is what the game shows.
//
// An empty query matches NOTHING rather than everything: search HIGHLIGHTS, it
// never hides (req 4), so a match-all would light the entire tree up instead of
// leaving it in its resting state.
export interface TechnologySearchSubject {
  // Null when no source localises the token. An untranslated technology stays
  // searchable by token; the absence surfaces rather than being papered over with
  // a fabricated display name (R-CODE-5).
  readonly name: null | string;
  readonly token: string;
}

export function matchesTechnologySearch(
  query: string,
  subject: TechnologySearchSubject,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return false;
  if (subject.token.toLowerCase().includes(needle)) return true;
  return subject.name !== null && subject.name.toLowerCase().includes(needle);
}
