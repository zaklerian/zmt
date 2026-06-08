export const PARADOX_DIALECTS = ['hoi4_bracket_expr'] as const;

export type ParadoxDialect = (typeof PARADOX_DIALECTS)[number];
