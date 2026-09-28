import { APP_API_GLOBAL } from '@zmt/contracts';
import { contextBridge } from 'electron';

import { buildAppApi } from './app-api.const';
import { invoke } from './ipc-invoke.util';

contextBridge.exposeInMainWorld(APP_API_GLOBAL, buildAppApi(invoke));
