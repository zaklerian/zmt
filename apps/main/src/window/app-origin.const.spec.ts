import {
  APP_HOST,
  APP_INDEX_URL,
  APP_ORIGIN,
  APP_SCHEME,
  resolveAppOrigin,
  resolveStartUrl,
} from './app-origin.const';

describe('app origin', () => {
  it('derives the production origin from the scheme and host', () => {
    expect(APP_SCHEME).toBe('zmt');
    expect(APP_HOST).toBe('renderer');
    expect(APP_ORIGIN).toBe('zmt://renderer');
    expect(APP_INDEX_URL).toBe('zmt://renderer/index.html');
  });

  it('uses the dev server origin in dev mode and the app origin otherwise', () => {
    expect(resolveAppOrigin({ ZMT_RENDERER_URL: 'http://localhost:4200/' })).toBe(
      'http://localhost:4200',
    );
    expect(resolveAppOrigin({})).toBe('zmt://renderer');
  });

  it('starts from the dev url or the packaged index', () => {
    expect(resolveStartUrl({ ZMT_RENDERER_URL: 'http://localhost:4200' })).toBe(
      'http://localhost:4200',
    );
    expect(resolveStartUrl({})).toBe('zmt://renderer/index.html');
  });
});
