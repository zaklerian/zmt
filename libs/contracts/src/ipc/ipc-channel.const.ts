export const IPC_CHANNELS = {
  entity: {
    delete: 'entity:delete',
    write: 'entity:write',
  },
  equipment: {
    list: 'equipment:list',
    slots: 'equipment:slots',
  },
  fs: {
    listDirectory: 'fs:listDirectory',
    openFolderDialog: 'fs:openFolderDialog',
    readTextFile: 'fs:readTextFile',
    searchFiles: 'fs:searchFiles',
    writeBinaryFile: 'fs:writeBinaryFile',
    writeTextFile: 'fs:writeTextFile',
  },
  module: {
    catalog: 'module:catalog',
    list: 'module:list',
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
