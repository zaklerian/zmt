import { buildCsp, CSP_HEADER, CSP_NONCE_PLACEHOLDER } from './csp.const';

function directives(csp: string): ReadonlyMap<string, string> {
  return new Map(
    csp.split('; ').map((directive) => {
      const [name = '', ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }),
  );
}

describe('buildCsp', () => {
  it('builds a strict production policy with a style nonce', () => {
    const csp = directives(buildCsp({ devOrigin: null, nonce: 'abc' }));
    expect(csp.get('default-src')).toBe("'self'");
    expect(csp.get('script-src')).toBe("'self' 'nonce-abc'");
    expect(csp.get('style-src')).toBe("'self' 'nonce-abc'");
    expect(csp.get('img-src')).toBe("'self' data: blob:");
    expect(csp.get('font-src')).toBe("'self' data:");
    expect(csp.get('connect-src')).toBe("'self'");
    expect(csp.get('object-src')).toBe("'none'");
    expect(csp.get('base-uri')).toBe("'self'");
    expect(csp.get('form-action')).toBe("'none'");
    expect(csp.get('frame-ancestors')).toBe("'none'");
    expect(buildCsp({ devOrigin: null, nonce: 'abc' })).not.toContain('unsafe');
  });

  it('allows the dev server and inline styles in dev mode without eval', () => {
    const csp = directives(buildCsp({ devOrigin: 'http://localhost:4200', nonce: null }));
    expect(csp.get('script-src')).toBe("'self' http://localhost:4200");
    expect(csp.get('style-src')).toBe("'self' http://localhost:4200 'unsafe-inline'");
    expect(csp.get('connect-src')).toBe("'self' http://localhost:4200 ws://localhost:4200");
    expect(buildCsp({ devOrigin: 'http://localhost:4200', nonce: null })).not.toContain(
      'unsafe-eval',
    );
  });

  it('falls back to no inline styles when neither a nonce nor a dev origin exists', () => {
    const csp = directives(buildCsp({ devOrigin: null, nonce: null }));
    expect(csp.get('style-src')).toBe("'self'");
  });

  it('names the header and the nonce placeholder', () => {
    expect(CSP_HEADER).toBe('Content-Security-Policy');
    expect(CSP_NONCE_PLACEHOLDER).toBe('ZMT_CSP_NONCE');
  });
});
