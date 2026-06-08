export type ExternalTokenizerFn = (input: unknown, stack: unknown) => void;

export interface ParserExtension {
  readonly dialects?: readonly string[];
  readonly externalTokenizers?: Readonly<Record<string, ExternalTokenizerFn>>;
}
