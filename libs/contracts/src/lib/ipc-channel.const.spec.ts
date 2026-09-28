import { IPC_CHANNEL_LIST, IPC_CHANNELS } from './ipc-channel.const';

describe('IPC_CHANNELS', () => {
  it('names every channel as group:method', () => {
    for (const [group, methods] of Object.entries(IPC_CHANNELS)) {
      for (const [method, channel] of Object.entries(methods)) {
        expect(channel).toBe(`${group}:${method}`);
      }
    }
  });

  it('flattens to a list without duplicates', () => {
    expect(IPC_CHANNEL_LIST).toHaveLength(7);
    expect(new Set(IPC_CHANNEL_LIST).size).toBe(IPC_CHANNEL_LIST.length);
    expect(IPC_CHANNEL_LIST).toContain('fs:listDirectory');
    expect(IPC_CHANNEL_LIST).toContain('system:ping');
  });
});
