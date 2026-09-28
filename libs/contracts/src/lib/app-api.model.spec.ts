import type { AppApi, IpcInvoke } from './app-api.model';
import type { FsNodeList } from './fs-node.schema';
import type { ListOptions } from './fs-request.schema';
import type { IpcRequest } from './ipc-contract.const';
import type { IpcResult } from './ipc-result.schema';

import { APP_API_GLOBAL } from './app-api.model';

describe('AppApi', () => {
  it('exposes the api under window.api', () => {
    expect(APP_API_GLOBAL).toBe('api');
  });

  it('derives one method per channel with the contract request and result types', () => {
    expectTypeOf<keyof AppApi>().toEqualTypeOf<'fs' | 'plugins' | 'system'>();
    expectTypeOf<keyof AppApi['fs']>().toEqualTypeOf<
      'listDirectory' | 'openFolderDialog' | 'readTextFile' | 'searchFiles' | 'writeTextFile'
    >();
    expectTypeOf<AppApi['system']['ping']>().toEqualTypeOf<() => Promise<IpcResult<'pong'>>>();
    expectTypeOf<AppApi['fs']['openFolderDialog']>().toEqualTypeOf<
      () => Promise<IpcResult<null | string>>
    >();
    expectTypeOf<AppApi['fs']['listDirectory']>().returns.toEqualTypeOf<
      Promise<IpcResult<FsNodeList>>
    >();
    expectTypeOf<AppApi['fs']['listDirectory']>()
      .parameter(0)
      .toEqualTypeOf<IpcRequest<'fs:listDirectory'>>();
    expectTypeOf<IpcRequest<'fs:listDirectory'>['path']>().toEqualTypeOf<string>();
    expectTypeOf<
      NonNullable<IpcRequest<'fs:listDirectory'>['options']>['hideUnsupportedFiles']
    >().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<IpcInvoke<'fs:writeTextFile'>>()
      .parameter(0)
      .toEqualTypeOf<IpcRequest<'fs:writeTextFile'>>();
    expectTypeOf<IpcRequest<'fs:writeTextFile'>['content']>().toEqualTypeOf<string>();
    expectTypeOf<ListOptions['hideUnsupportedFiles']>().toEqualTypeOf<boolean>();
  });
});
