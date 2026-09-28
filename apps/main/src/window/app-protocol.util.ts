import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { resolveRealPath } from '../fs/path-guard.util';
import { APP_HOST, APP_SCHEME } from './app-origin.const';
import { buildCsp, CSP_HEADER, CSP_NONCE_PLACEHOLDER } from './csp.const';

export const APP_SCHEME_PRIVILEGES = {
  privileges: {
    corsEnabled: false,
    secure: true,
    standard: true,
    supportFetchAPI: true,
  },
  scheme: APP_SCHEME,
} as const;

export const MIME_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function mimeTypeOf(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export function createNonce(): string {
  return randomBytes(16).toString('base64');
}

export function injectNonce(html: string, nonce: string): string {
  return html.replaceAll(CSP_NONCE_PLACEHOLDER, nonce);
}

export interface AppProtocolOptions {
  readonly distDir: string;
  readonly indexFile?: string;
}

export function isPageRequest(pathname: string): boolean {
  return pathname === '/' || path.extname(pathname) === '';
}

export async function resolveAsset(distDir: string, pathname: string): Promise<null | string> {
  const decoded = decodeURIComponent(pathname);
  const candidate = path.join(distDir, decoded);
  const real = await resolveRealPath(candidate).catch(() => null);
  if (real === null) {
    return null;
  }
  const root = await resolveRealPath(distDir);
  if (real !== root && !real.startsWith(root + path.sep)) {
    return null;
  }
  try {
    const stat = await fs.stat(real);
    return stat.isFile() ? real : null;
  } catch {
    return null;
  }
}

export async function handleAppRequest(
  request: Request,
  options: AppProtocolOptions,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.host !== APP_HOST) {
    return new Response(null, { status: 403 });
  }
  const indexFile = options.indexFile ?? 'index.html';
  const asset = isPageRequest(url.pathname)
    ? path.join(options.distDir, indexFile)
    : await resolveAsset(options.distDir, url.pathname);
  if (asset === null) {
    return new Response(null, { status: 404 });
  }
  if (path.basename(asset) === indexFile) {
    const nonce = createNonce();
    const html = injectNonce(await fs.readFile(asset, 'utf8'), nonce);
    return new Response(html, {
      headers: {
        'Content-Type': mimeTypeOf(asset),
        [CSP_HEADER]: buildCsp({ devOrigin: null, nonce }),
      },
      status: 200,
    });
  }
  const body = await fs.readFile(asset);
  return new Response(body, {
    headers: { 'Content-Type': mimeTypeOf(asset) },
    status: 200,
  });
}
