import * as v from 'valibot';

import {
  FOLDER_DIALOG_RESPONSE_SCHEMA,
  LIST_DIRECTORY_REQUEST_SCHEMA,
  LIST_OPTIONS_SCHEMA,
  PATH_SCHEMA,
  READ_TEXT_FILE_REQUEST_SCHEMA,
  SEARCH_FILES_REQUEST_SCHEMA,
  WRITE_TEXT_FILE_REQUEST_SCHEMA,
} from './fs-request.schema';
import { MAX_PATH_LENGTH, MAX_SEARCH_QUERY_LENGTH } from './payload-limit.const';

describe('PATH_SCHEMA', () => {
  it('accepts a non-empty path up to the limit', () => {
    expect(v.parse(PATH_SCHEMA, '/root')).toBe('/root');
    expect(v.parse(PATH_SCHEMA, 'x'.repeat(MAX_PATH_LENGTH))).toHaveLength(MAX_PATH_LENGTH);
  });

  it.each([[''], ['x'.repeat(MAX_PATH_LENGTH + 1)], [42], [null]])('rejects %j', (value) => {
    expect(v.safeParse(PATH_SCHEMA, value).success).toBe(false);
  });
});

describe('LIST_OPTIONS_SCHEMA', () => {
  it('defaults hideUnsupportedFiles to false', () => {
    expect(v.parse(LIST_OPTIONS_SCHEMA, {})).toEqual({ hideUnsupportedFiles: false });
    expect(v.parse(LIST_OPTIONS_SCHEMA, { hideUnsupportedFiles: true })).toEqual({
      hideUnsupportedFiles: true,
    });
  });

  it('rejects a non-boolean flag', () => {
    expect(v.safeParse(LIST_OPTIONS_SCHEMA, { hideUnsupportedFiles: 'yes' }).success).toBe(false);
  });
});

describe('LIST_DIRECTORY_REQUEST_SCHEMA', () => {
  it('fills in default options', () => {
    expect(v.parse(LIST_DIRECTORY_REQUEST_SCHEMA, { path: '/root' })).toEqual({
      options: { hideUnsupportedFiles: false },
      path: '/root',
    });
  });

  it('drops unknown keys', () => {
    expect(v.parse(LIST_DIRECTORY_REQUEST_SCHEMA, { extra: 1, path: '/root' })).toEqual({
      options: { hideUnsupportedFiles: false },
      path: '/root',
    });
  });
});

describe('SEARCH_FILES_REQUEST_SCHEMA', () => {
  it('accepts an empty query and defaults options', () => {
    expect(v.parse(SEARCH_FILES_REQUEST_SCHEMA, { query: '', root: '/root' })).toEqual({
      options: { hideUnsupportedFiles: false },
      query: '',
      root: '/root',
    });
  });

  it('caps the query length', () => {
    const query = 'q'.repeat(MAX_SEARCH_QUERY_LENGTH);
    expect(v.parse(SEARCH_FILES_REQUEST_SCHEMA, { query, root: '/root' }).query).toBe(query);
    expect(
      v.safeParse(SEARCH_FILES_REQUEST_SCHEMA, { query: `${query}q`, root: '/root' }).success,
    ).toBe(false);
  });
});

describe('READ_TEXT_FILE_REQUEST_SCHEMA', () => {
  it('requires a path', () => {
    expect(v.parse(READ_TEXT_FILE_REQUEST_SCHEMA, { path: '/root/a.txt' })).toEqual({
      path: '/root/a.txt',
    });
    expect(v.safeParse(READ_TEXT_FILE_REQUEST_SCHEMA, {}).success).toBe(false);
  });
});

describe('WRITE_TEXT_FILE_REQUEST_SCHEMA', () => {
  it('accepts empty content', () => {
    expect(v.parse(WRITE_TEXT_FILE_REQUEST_SCHEMA, { content: '', path: '/root/a.txt' })).toEqual({
      content: '',
      path: '/root/a.txt',
    });
  });

  it('rejects non-string content', () => {
    expect(
      v.safeParse(WRITE_TEXT_FILE_REQUEST_SCHEMA, { content: new Uint8Array(), path: '/r' })
        .success,
    ).toBe(false);
  });
});

describe('FOLDER_DIALOG_RESPONSE_SCHEMA', () => {
  it('accepts a path or null', () => {
    expect(v.parse(FOLDER_DIALOG_RESPONSE_SCHEMA, null)).toBeNull();
    expect(v.parse(FOLDER_DIALOG_RESPONSE_SCHEMA, '/picked')).toBe('/picked');
    expect(v.safeParse(FOLDER_DIALOG_RESPONSE_SCHEMA, undefined).success).toBe(false);
  });
});
