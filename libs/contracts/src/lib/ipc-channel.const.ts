export const IPC_CHANNELS = {
  fs: {
    listDirectory: 'fs:listDirectory',
    openFolderDialog: 'fs:openFolderDialog',
    readTextFile: 'fs:readTextFile',
    searchFiles: 'fs:searchFiles',
    writeTextFile: 'fs:writeTextFile',
  },
  plugins: {
    list: 'plugins:list',
  },
  system: {
    ping: 'system:ping',
  },
} as const;

export type IpcChannelGroups = typeof IPC_CHANNELS;

export type IpcChannelGroup = keyof IpcChannelGroups;

export type IpcChannel = {
  [G in IpcChannelGroup]: IpcChannelGroups[G][keyof IpcChannelGroups[G]];
}[IpcChannelGroup];

export const IPC_CHANNEL_LIST: readonly IpcChannel[] = Object.values(IPC_CHANNELS).flatMap(
  (group): readonly IpcChannel[] => Object.values(group),
);
