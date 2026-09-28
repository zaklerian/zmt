export const CSP_HEADER = 'Content-Security-Policy';

export const CSP_NONCE_PLACEHOLDER = 'ZMT_CSP_NONCE';

export interface CspOptions {
  readonly devOrigin: null | string;
  readonly nonce: null | string;
}

export function buildCsp(options: CspOptions): string {
  const self = ["'self'"];
  const dev = options.devOrigin === null ? [] : [options.devOrigin];
  const devWs = options.devOrigin === null ? [] : [options.devOrigin.replace(/^http/u, 'ws')];
  const nonce = options.nonce === null ? [] : [`'nonce-${options.nonce}'`];
  const inlineStyle =
    options.nonce === null && options.devOrigin !== null ? ["'unsafe-inline'"] : nonce;
  const directives: readonly (readonly string[])[] = [
    ['default-src', ...self],
    ['script-src', ...self, ...dev, ...nonce],
    ['style-src', ...self, ...dev, ...inlineStyle],
    ['img-src', ...self, 'data:', 'blob:'],
    ['font-src', ...self, 'data:'],
    ['connect-src', ...self, ...dev, ...devWs],
    ['object-src', "'none'"],
    ['base-uri', ...self],
    ['form-action', "'none'"],
    ['frame-ancestors', "'none'"],
  ];
  return directives.map((directive) => directive.join(' ')).join('; ');
}
