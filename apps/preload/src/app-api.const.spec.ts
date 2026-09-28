import { IPC_CHANNEL_LIST, IPC_CHANNELS } from '@zmt/contracts';
import { contextBridge } from 'electron';

import { buildAppApi } from './app-api.const';
import { type InvokeFn } from './ipc-invoke.util';

describe('buildAppApi', () => {
  it('exposes exactly one method per channel, grouped like the channel constants', () => {
    const api = buildAppApi(vi.fn<InvokeFn>());
    expect(Object.keys(api).sort()).toEqual(Object.keys(IPC_CHANNELS).sort());
    for (const [group, methods] of Object.entries(IPC_CHANNELS)) {
      expect(Object.keys(api[group as keyof typeof api]).sort()).toEqual(
        Object.keys(methods).sort(),
      );
    }
    const methodCount = Object.values(api).reduce(
      (count, group) => count + Object.keys(group).length,
      0,
    );
    expect(methodCount).toBe(IPC_CHANNEL_LIST.length);
  });

  it('routes each method to its channel with the request object', async () => {
    const invokeFn = vi.fn<InvokeFn>().mockResolvedValue({ data: 'pong', ok: true });
    const api = buildAppApi(invokeFn);
    await expect(api.system.ping()).resolves.toEqual({ data: 'pong', ok: true });
    expect(invokeFn).toHaveBeenLastCalledWith('system:ping', undefined);
    await api.fs.listDirectory({ path: '/root' });
    expect(invokeFn).toHaveBeenLastCalledWith('fs:listDirectory', { path: '/root' });
    await api.fs.writeTextFile({ content: 'body', path: '/root/a.txt' });
    expect(invokeFn).toHaveBeenLastCalledWith('fs:writeTextFile', {
      content: 'body',
      path: '/root/a.txt',
    });
    await api.plugins.list();
    expect(invokeFn).toHaveBeenLastCalledWith('plugins:list', undefined);
  });

  it('is deeply frozen so nothing can be added or replaced', () => {
    const api = buildAppApi(vi.fn<InvokeFn>());
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.fs)).toBe(true);
    expect(Object.isFrozen(api.fs.readTextFile)).toBe(true);
    expect(() => {
      Object.defineProperty(api, 'extra', { value: 1 });
    }).toThrow(TypeError);
  });

  it('does not leak ipcRenderer or a generic invoke', () => {
    const api = buildAppApi(vi.fn<InvokeFn>());
    expect(api).not.toHaveProperty('invoke');
    expect(api).not.toHaveProperty('ipcRenderer');
    expect(contextBridge.exposeInMainWorld).not.toHaveBeenCalled();
  });
});
