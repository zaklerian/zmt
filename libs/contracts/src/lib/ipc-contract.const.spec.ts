import * as v from 'valibot';

import { FILE_SUPPORT, type FsNode } from './fs-node.schema';
import { GAME_IDS } from './game-plugin.schema';
import { IPC_CHANNEL_LIST, IPC_CHANNELS, type IpcChannel } from './ipc-channel.const';
import { IPC_CONTRACTS, type IpcRequest, type IpcResponse } from './ipc-contract.const';
import { IPC_ERROR_CODES } from './ipc-error.schema';
import { fail, ok } from './ipc-result.schema';

const NODE: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'readme.txt',
  path: '/root/readme.txt',
  support: FILE_SUPPORT.editable,
  type: 'file',
};

interface Sample<C extends IpcChannel> {
  readonly invalidRequests: readonly unknown[];
  readonly invalidResponses: readonly unknown[];
  readonly request: IpcRequest<C>;
  readonly response: IpcResponse<C>;
}

const SAMPLES: { readonly [C in IpcChannel]: Sample<C> } = {
  [IPC_CHANNELS.fs.listDirectory]: {
    invalidRequests: [
      undefined,
      { path: '' },
      { path: 42 },
      { options: { hideUnsupportedFiles: 1 }, path: '/r' },
    ],
    invalidResponses: [[{ ...NODE, support: 'binary' }], [{ ...NODE, type: 'link' }], 'x'],
    request: { options: { hideUnsupportedFiles: true }, path: '/root' },
    response: [NODE],
  },
  [IPC_CHANNELS.fs.openFolderDialog]: {
    invalidRequests: ['/root', {}, null],
    invalidResponses: [42, '', { path: '/root' }],
    request: undefined,
    response: '/root',
  },
  [IPC_CHANNELS.fs.readTextFile]: {
    invalidRequests: [undefined, { path: '' }, { path: 'x'.repeat(4097) }, '/root/a.txt'],
    invalidResponses: [null, 42, ['text']],
    request: { path: '/root/a.txt' },
    response: 'hello',
  },
  [IPC_CHANNELS.fs.searchFiles]: {
    invalidRequests: [
      undefined,
      { root: '/r' },
      { query: 42, root: '/r' },
      { query: 'x'.repeat(257), root: '/r' },
    ],
    invalidResponses: [[{ ...NODE, hasChildren: 'no' }], null],
    request: { query: 'readme', root: '/root' },
    response: [NODE],
  },
  [IPC_CHANNELS.fs.writeTextFile]: {
    invalidRequests: [undefined, { content: 42, path: '/r/a.txt' }, { content: 'x' }],
    invalidResponses: [undefined, 'ok', 0],
    request: { content: 'body', path: '/root/a.txt' },
    response: null,
  },
  [IPC_CHANNELS.plugins.list]: {
    invalidRequests: [{}, 'hoi4', []],
    invalidResponses: [
      [{ displayName: '', features: [], gameId: GAME_IDS.hoi4 }],
      [{ gameId: 'ck3' }],
      null,
    ],
    request: undefined,
    response: [
      {
        displayName: 'Hearts of Iron IV',
        features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
        gameId: GAME_IDS.hoi4,
      },
    ],
  },
  [IPC_CHANNELS.system.ping]: {
    invalidRequests: [{}, 'ping', 0],
    invalidResponses: ['ping', null, ''],
    request: undefined,
    response: 'pong',
  },
};

describe('IPC_CONTRACTS', () => {
  it('covers every channel and nothing else', () => {
    expect(Object.keys(IPC_CONTRACTS).sort()).toEqual([...IPC_CHANNEL_LIST].sort());
    expect(Object.isFrozen(IPC_CONTRACTS)).toBe(true);
  });

  describe.each(IPC_CHANNEL_LIST)('%s', (channel) => {
    const contract = IPC_CONTRACTS[channel];
    const sample: Sample<IpcChannel> = SAMPLES[channel];

    it('round-trips its request', () => {
      const parsed = v.parse(contract.request, sample.request);
      expect(parsed).toEqual(v.parse(contract.request, parsed));
    });

    it('round-trips its response inside an ok envelope', () => {
      const envelope = ok(v.parse(contract.response, sample.response));
      expect(v.parse(contract.result, envelope)).toEqual(envelope);
    });

    it('round-trips every error code inside a fail envelope', () => {
      for (const code of Object.values(IPC_ERROR_CODES)) {
        const envelope = fail(code, `failed with ${String(code)}`);
        expect(v.parse(contract.result, envelope)).toEqual(envelope);
      }
    });

    it('rejects malformed requests without throwing', () => {
      for (const invalid of sample.invalidRequests) {
        expect(v.safeParse(contract.request, invalid).success).toBe(false);
      }
    });

    it('rejects malformed responses without throwing', () => {
      for (const invalid of sample.invalidResponses) {
        expect(v.safeParse(contract.response, invalid).success).toBe(false);
        expect(v.safeParse(contract.result, { data: invalid, ok: true }).success).toBe(false);
      }
    });

    it('rejects an envelope that mixes ok and error', () => {
      expect(v.safeParse(contract.result, { data: sample.response, ok: false }).success).toBe(
        false,
      );
      expect(
        v.safeParse(contract.result, { error: { code: 500, message: 'x' }, ok: true }).success,
      ).toBe(false);
    });
  });
});
