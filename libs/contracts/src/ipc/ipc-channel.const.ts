export const IPC_CHANNELS = {
  fs: {
    listDirectory: 'fs:listDirectory',
    openFolderDialog: 'fs:openFolderDialog',
    readTextFile: 'fs:readTextFile',
    searchFiles: 'fs:searchFiles',
    writeBinaryFile: 'fs:writeBinaryFile',
    writeTextFile: 'fs:writeTextFile',
  },
  plugins: {
    list: 'plugins:list',
  },
  preferences: {
    get: 'preferences:get',
    getAll: 'preferences:getAll',
    set: 'preferences:set',
  },
  system: {
    ping: 'system:ping',
  },
  workspace: {
    closeMod: 'workspace:closeMod',
    get: 'workspace:get',
    openMod: 'workspace:openMod',
  },
} as const;
