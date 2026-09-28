declare const SAFE_PATH_BRAND: unique symbol;

export type SafePath = string & { readonly [SAFE_PATH_BRAND]: true };
