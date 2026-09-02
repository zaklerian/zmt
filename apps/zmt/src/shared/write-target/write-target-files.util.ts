import { WRITE_KIND_LOCATIONS, WriteKind } from '@contracts';

// A mod-relative, POSIX-separated path from the absolute one the fs channel
// returns. The store holds mod-relative paths only (ADR 029 decision 4), and the
// separator is normalized because a Windows `fs` result is backslash-separated
// while every path the write boundary resolves is not.
export function toModRelativePath(
  modPath: string,
  absolutePath: string,
): string {
  const normalizedRoot = modPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const normalized = absolutePath.replace(/\\/g, '/');
  return normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : normalized;
}

// The mod-relative path a name typed into the create-new field means: the kind's
// folder, then what the user typed, with the kind's extension appended when it is
// missing. Sub-paths are allowed (`english/my_mod_l_english.yml`) because a mod's
// localisation is routinely folder-split; a name that already starts with the
// folder is not doubled.
export function toNewTargetPath(kind: WriteKind, name: string): null | string {
  const { extension, folder } = WRITE_KIND_LOCATIONS[kind];
  const trimmed = name.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (trimmed === '') return null;
  const withExtension = trimmed.toLowerCase().endsWith(extension)
    ? trimmed
    : `${trimmed}${extension}`;
  return withExtension.startsWith(`${folder}/`)
    ? withExtension
    : `${folder}/${withExtension}`;
}
