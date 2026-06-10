export const IPC_CHANNELS = {
  entity: {
    delete: 'entity:delete',
    write: 'entity:write',
  },
  equipment: {
    list: 'equipment:list',
  },
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
    addMod: 'workspace:addMod',
    get: 'workspace:get',
    removeMod: 'workspace:removeMod',
  },
} as const;
