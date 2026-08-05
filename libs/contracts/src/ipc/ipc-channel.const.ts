export const IPC_CHANNELS = {
  character: {
    list: 'character:list',
  },
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
  ideology: {
    list: 'ideology:list',
  },
  index: {
    detail: 'index:detail',
    list: 'index:list',
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
  state: {
    list: 'state:list',
  },
  system: {
    ping: 'system:ping',
  },
  technology: {
    list: 'technology:list',
  },
  techTreeGeometry: {
    read: 'techTreeGeometry:read',
  },
  workspace: {
    addMod: 'workspace:addMod',
    get: 'workspace:get',
    removeMod: 'workspace:removeMod',
  },
} as const;
