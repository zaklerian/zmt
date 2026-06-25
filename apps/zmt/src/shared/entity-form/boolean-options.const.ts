// HOI4 booleans are the bare `yes` / `no` file tokens, rendered raw like a
// property key since they are intrinsic source tokens, not UI chrome. The same
// two tokens drive the yes/no select options AND the boolean field's Zod set, so
// a stored value, an option value, and the validated/written-back value all share
// one string representation — never a JS boolean, which neither matches an option
// nor survives the string-keyed save delta (ZMT-E14).
export const BOOLEAN_TRUE = 'yes';
export const BOOLEAN_FALSE = 'no';
export const BOOLEAN_OPTIONS: readonly string[] = [BOOLEAN_TRUE, BOOLEAN_FALSE];
