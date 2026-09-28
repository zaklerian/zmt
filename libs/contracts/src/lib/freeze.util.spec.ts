import type * as v from 'valibot';

import { deepFreeze, type DeepReadonly } from './freeze.util';
import { type FS_NODE_LIST_SCHEMA, type FS_NODE_SCHEMA } from './fs-node.schema';
import {
  type LIST_DIRECTORY_REQUEST_SCHEMA,
  type LIST_OPTIONS_SCHEMA,
  type READ_TEXT_FILE_REQUEST_SCHEMA,
  type SEARCH_FILES_REQUEST_SCHEMA,
  type WRITE_TEXT_FILE_REQUEST_SCHEMA,
} from './fs-request.schema';
import {
  type FEATURE_CONTRIBUTION_SCHEMA,
  type GAME_PLUGIN_LIST_SCHEMA,
  type GAME_PLUGIN_SCHEMA,
} from './game-plugin.schema';
import { type IPC_CONTRACTS } from './ipc-contract.const';
import { type IPC_ERROR_SCHEMA } from './ipc-error.schema';

type Output<S extends v.GenericSchema> = v.InferOutput<S>;

describe('deepFreeze', () => {
  it('freezes nested objects and arrays', () => {
    const value = deepFreeze({ list: [{ deep: { flag: true } }], name: 'x' });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.list[0]?.deep)).toBe(true);
  });

  it('freezes functions and their properties', () => {
    const api = deepFreeze({ call: Object.assign(() => 1, { meta: { flag: true } }) });
    expect(Object.isFrozen(api.call)).toBe(true);
    expect(Object.isFrozen(api.call.meta)).toBe(true);
    expect(api.call()).toBe(1);
  });

  it('returns primitives and null unchanged', () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('text')).toBe('text');
    expect(deepFreeze(null)).toBeNull();
  });

  it('leaves typed arrays writable so binary payloads stay usable', () => {
    const bytes = new Uint8Array([1, 2]);
    const frozen = deepFreeze({ bytes });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(bytes)).toBe(false);
    bytes[0] = 9;
    expect(frozen.bytes[0]).toBe(9);
  });

  it('skips objects that are already frozen', () => {
    const inner = { flag: true };
    const outer = Object.freeze({ inner });
    deepFreeze(outer);
    expect(Object.isFrozen(inner)).toBe(false);
  });
});

describe('exported object and array schemas infer deeply readonly types (SEC-7)', () => {
  it('holds for every exported schema', () => {
    expectTypeOf<Output<typeof IPC_ERROR_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof IPC_ERROR_SCHEMA>>
    >();
    expectTypeOf<Output<typeof FS_NODE_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof FS_NODE_SCHEMA>>
    >();
    expectTypeOf<Output<typeof FS_NODE_LIST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof FS_NODE_LIST_SCHEMA>>
    >();
    expectTypeOf<Output<typeof LIST_OPTIONS_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof LIST_OPTIONS_SCHEMA>>
    >();
    expectTypeOf<Output<typeof LIST_DIRECTORY_REQUEST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof LIST_DIRECTORY_REQUEST_SCHEMA>>
    >();
    expectTypeOf<Output<typeof SEARCH_FILES_REQUEST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof SEARCH_FILES_REQUEST_SCHEMA>>
    >();
    expectTypeOf<Output<typeof READ_TEXT_FILE_REQUEST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof READ_TEXT_FILE_REQUEST_SCHEMA>>
    >();
    expectTypeOf<Output<typeof WRITE_TEXT_FILE_REQUEST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof WRITE_TEXT_FILE_REQUEST_SCHEMA>>
    >();
    expectTypeOf<Output<typeof FEATURE_CONTRIBUTION_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof FEATURE_CONTRIBUTION_SCHEMA>>
    >();
    expectTypeOf<Output<typeof GAME_PLUGIN_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof GAME_PLUGIN_SCHEMA>>
    >();
    expectTypeOf<Output<typeof GAME_PLUGIN_LIST_SCHEMA>>().toEqualTypeOf<
      DeepReadonly<Output<typeof GAME_PLUGIN_LIST_SCHEMA>>
    >();
    expectTypeOf<Output<(typeof IPC_CONTRACTS)['fs:listDirectory']['result']>>().toEqualTypeOf<
      DeepReadonly<Output<(typeof IPC_CONTRACTS)['fs:listDirectory']['result']>>
    >();
    expectTypeOf<Output<(typeof IPC_CONTRACTS)['plugins:list']['result']>>().toEqualTypeOf<
      DeepReadonly<Output<(typeof IPC_CONTRACTS)['plugins:list']['result']>>
    >();
  });
});
