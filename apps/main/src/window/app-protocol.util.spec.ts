import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  APP_SCHEME_PRIVILEGES,
  createNonce,
  handleAppRequest,
  injectNonce,
  isPageRequest,
  mimeTypeOf,
  resolveAsset,
} from './app-protocol.util';

describe('handleAppRequest', () => {
  let base = '';
  let distDir = '';

  beforeEach(async () => {
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-protocol-')));
    distDir = path.join(base, 'browser');
    await fs.mkdir(path.join(distDir, 'assets'), { recursive: true });
    await fs.writeFile(
      path.join(distDir, 'index.html'),
      '<html><body><zmt-shell ngCspNonce="ZMT_CSP_NONCE"></zmt-shell></body></html>',
    );
    await fs.writeFile(path.join(distDir, 'main.js'), 'console.log(1)');
    await fs.writeFile(path.join(distDir, 'styles.css'), 'body{}');
    await fs.writeFile(path.join(distDir, 'assets', 'logo.png'), Buffer.from([1, 2, 3]));
    await fs.writeFile(path.join(base, 'secret.txt'), 'secret');
    await fs.symlink(path.join(base, 'secret.txt'), path.join(distDir, 'escape.txt'));
  });

  afterEach(async () => {
    await fs.rm(base, { force: true, recursive: true });
  });

  async function request(url: string, method = 'GET'): Promise<Response> {
    return handleAppRequest(new Request(url, { method }), { distDir });
  }

  it('serves index.html with a fresh nonce and a nonce-bound CSP', async () => {
    const response = await request('zmt://renderer/index.html');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const html = await response.text();
    const nonce = /ngCspNonce="([^"]+)"/u.exec(html)?.[1];
    expect(nonce).toBeDefined();
    expect(nonce).not.toBe('ZMT_CSP_NONCE');
    expect(response.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce ?? ''}'`);
    expect(response.headers.get('Content-Security-Policy')).toContain(
      `script-src 'self' 'nonce-${nonce ?? ''}'`,
    );
    const second = await (await request('zmt://renderer/index.html')).text();
    expect(second).not.toBe(html);
  });

  it('falls back to index.html for the root and for extension-less routes', async () => {
    expect((await request('zmt://renderer/')).status).toBe(200);
    const routed = await request('zmt://renderer/some/route');
    expect(routed.status).toBe(200);
    expect(await routed.text()).toContain('<zmt-shell');
  });

  it('serves static assets with their mime type', async () => {
    const script = await request('zmt://renderer/main.js');
    expect(script.status).toBe(200);
    expect(script.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    expect(script.headers.get('Content-Security-Policy')).toBeNull();
    expect(await script.text()).toBe('console.log(1)');
    const image = await request('zmt://renderer/assets/logo.png');
    expect(image.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns 404 for missing assets, traversal attempts and symlink escapes', async () => {
    expect((await request('zmt://renderer/missing.js')).status).toBe(404);
    expect((await request('zmt://renderer/../secret.txt')).status).toBe(404);
    expect((await request('zmt://renderer/%2e%2e/secret.txt')).status).toBe(404);
    expect((await request('zmt://renderer/escape.txt')).status).toBe(404);
    expect((await request('zmt://renderer/assets')).status).toBe(200);
    expect((await request('zmt://renderer/assets.css')).status).toBe(404);
  });

  it('refuses other hosts and methods', async () => {
    expect((await request('zmt://other/index.html')).status).toBe(403);
    expect((await request('zmt://renderer/index.html', 'POST')).status).toBe(403);
  });

  it('registers the scheme as a standard, secure, fetch-capable scheme without CORS', () => {
    expect(APP_SCHEME_PRIVILEGES).toEqual({
      privileges: { corsEnabled: false, secure: true, standard: true, supportFetchAPI: true },
      scheme: 'zmt',
    });
  });
});

describe('resolveAsset', () => {
  it('returns null for a directory', async () => {
    const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-asset-')));
    try {
      await expect(resolveAsset(dir, '/')).resolves.toBeNull();
    } finally {
      await fs.rm(dir, { force: true, recursive: true });
    }
  });
});

describe('helpers', () => {
  it('maps extensions to mime types with a binary fallback', () => {
    expect(mimeTypeOf('a.css')).toBe('text/css; charset=utf-8');
    expect(mimeTypeOf('a.WOFF2')).toBe('font/woff2');
    expect(mimeTypeOf('a.unknown')).toBe('application/octet-stream');
  });

  it('detects page requests', () => {
    expect(isPageRequest('/')).toBe(true);
    expect(isPageRequest('/route/sub')).toBe(true);
    expect(isPageRequest('/main.js')).toBe(false);
  });

  it('creates base64 nonces and injects them', () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/u);
    expect(createNonce()).not.toBe(nonce);
    expect(injectNonce('a ZMT_CSP_NONCE b ZMT_CSP_NONCE', 'n')).toBe('a n b n');
  });
});
