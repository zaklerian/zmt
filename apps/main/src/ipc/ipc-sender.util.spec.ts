import { isTrustedSender, originOf } from './ipc-sender.util';

const APP_ORIGIN = 'zmt://renderer';

describe('isTrustedSender', () => {
  it('accepts the top frame of the app origin', () => {
    expect(
      isTrustedSender(
        { senderFrame: { parent: null, url: `${APP_ORIGIN}/index.html` } },
        APP_ORIGIN,
      ),
    ).toBe(true);
    expect(
      isTrustedSender(
        { senderFrame: { parent: null, url: 'http://localhost:4200/' } },
        'http://localhost:4200',
      ),
    ).toBe(true);
  });

  it('rejects a missing frame', () => {
    expect(isTrustedSender({ senderFrame: null }, APP_ORIGIN)).toBe(false);
  });

  it('rejects a child frame even on the app origin', () => {
    expect(
      isTrustedSender(
        {
          senderFrame: {
            parent: { parent: null, url: `${APP_ORIGIN}/` },
            url: `${APP_ORIGIN}/frame.html`,
          },
        },
        APP_ORIGIN,
      ),
    ).toBe(false);
  });

  it('rejects other origins, schemes, hosts and ports', () => {
    expect(
      isTrustedSender({ senderFrame: { parent: null, url: 'https://evil.example/' } }, APP_ORIGIN),
    ).toBe(false);
    expect(
      isTrustedSender({ senderFrame: { parent: null, url: 'zmt://other/' } }, APP_ORIGIN),
    ).toBe(false);
    expect(
      isTrustedSender(
        { senderFrame: { parent: null, url: 'http://localhost:4201/' } },
        'http://localhost:4200',
      ),
    ).toBe(false);
    expect(isTrustedSender({ senderFrame: { parent: null, url: 'about:blank' } }, APP_ORIGIN)).toBe(
      false,
    );
    expect(isTrustedSender({ senderFrame: { parent: null, url: 'not a url' } }, APP_ORIGIN)).toBe(
      false,
    );
  });
});

describe('originOf', () => {
  it('returns the origin or null for an unparsable url', () => {
    expect(originOf('zmt://renderer/index.html?x=1')).toBe('zmt://renderer');
    expect(originOf('http://localhost:4200/path')).toBe('http://localhost:4200');
    expect(originOf('')).toBeNull();
  });
});
