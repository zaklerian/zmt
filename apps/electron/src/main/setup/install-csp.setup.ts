import { session } from 'electron';

const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:4200",
  "style-src 'self' 'unsafe-inline' http://localhost:4200",
  "connect-src 'self' ws://localhost:4200 http://localhost:4200",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
].join('; ');

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

export function installContentSecurityPolicy(): void {
  const csp = process.env.ZMT_RENDERER_URL ? DEV_CSP : PROD_CSP;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}
