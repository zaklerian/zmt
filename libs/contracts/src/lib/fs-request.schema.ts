import * as v from 'valibot';

import { MAX_PATH_LENGTH, MAX_SEARCH_QUERY_LENGTH } from './payload-limit.const';

export const PATH_SCHEMA = v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_PATH_LENGTH));

export const LIST_OPTIONS_SCHEMA = v.pipe(
  v.object({
    hideUnsupportedFiles: v.optional(v.boolean(), false),
  }),
  v.readonly(),
);

export type ListOptions = v.InferOutput<typeof LIST_OPTIONS_SCHEMA>;

export const LIST_DIRECTORY_REQUEST_SCHEMA = v.pipe(
  v.object({
    options: v.optional(LIST_OPTIONS_SCHEMA, { hideUnsupportedFiles: false }),
    path: PATH_SCHEMA,
  }),
  v.readonly(),
);

export type ListDirectoryRequest = v.InferOutput<typeof LIST_DIRECTORY_REQUEST_SCHEMA>;

export const SEARCH_FILES_REQUEST_SCHEMA = v.pipe(
  v.object({
    options: v.optional(LIST_OPTIONS_SCHEMA, { hideUnsupportedFiles: false }),
    query: v.pipe(v.string(), v.maxLength(MAX_SEARCH_QUERY_LENGTH)),
    root: PATH_SCHEMA,
  }),
  v.readonly(),
);

export type SearchFilesRequest = v.InferOutput<typeof SEARCH_FILES_REQUEST_SCHEMA>;

export const READ_TEXT_FILE_REQUEST_SCHEMA = v.pipe(
  v.object({
    path: PATH_SCHEMA,
  }),
  v.readonly(),
);

export type ReadTextFileRequest = v.InferOutput<typeof READ_TEXT_FILE_REQUEST_SCHEMA>;

export const WRITE_TEXT_FILE_REQUEST_SCHEMA = v.pipe(
  v.object({
    content: v.string(),
    path: PATH_SCHEMA,
  }),
  v.readonly(),
);

export type WriteTextFileRequest = v.InferOutput<typeof WRITE_TEXT_FILE_REQUEST_SCHEMA>;

export const FOLDER_DIALOG_RESPONSE_SCHEMA = v.nullable(PATH_SCHEMA);

export type FolderDialogResponse = v.InferOutput<typeof FOLDER_DIALOG_RESPONSE_SCHEMA>;
