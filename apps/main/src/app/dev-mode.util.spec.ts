import { defaultRootPath, isDevMode, rendererDevUrl } from './dev-mode.util';

describe('dev-mode', () => {
  it('reads the renderer dev url from the environment', () => {
    expect(rendererDevUrl({ ZMT_RENDERER_URL: 'http://localhost:4200' })).toBe(
      'http://localhost:4200',
    );
    expect(rendererDevUrl({})).toBeNull();
    expect(rendererDevUrl({ ZMT_RENDERER_URL: '' })).toBeNull();
    expect(rendererDevUrl({ ZMT_RENDERER_URL: undefined })).toBeNull();
  });

  it('is in dev mode only when the renderer dev url is set', () => {
    expect(isDevMode({ ZMT_RENDERER_URL: 'http://localhost:4200' })).toBe(true);
    expect(isDevMode({})).toBe(false);
    expect(isDevMode({ ZMT_RENDERER_URL: '' })).toBe(false);
  });

  it('reads the default root path from the environment', () => {
    expect(defaultRootPath({ ZMT_DEFAULT_MODS_PATH: '/mods' })).toBe('/mods');
    expect(defaultRootPath({})).toBeNull();
    expect(defaultRootPath({ ZMT_DEFAULT_MODS_PATH: '' })).toBeNull();
  });
});
