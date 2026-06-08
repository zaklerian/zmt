export function dialectsFromPlugins(
  plugins: readonly {
    readonly parserExtension?: { readonly dialects?: readonly string[] };
  }[],
): readonly string[] {
  const seen = new Set<string>();
  for (const plugin of plugins) {
    for (const dialect of plugin.parserExtension?.dialects ?? []) {
      seen.add(dialect);
    }
  }
  return [...seen];
}
