export const RENDERER_URL_VARIABLE = 'ZMT_RENDERER_URL';

export const DEFAULT_ROOT_VARIABLE = 'ZMT_DEFAULT_MODS_PATH';

export type Environment = Readonly<Record<string, string | undefined>>;

export function rendererDevUrl(env: Environment): null | string {
  const value = env[RENDERER_URL_VARIABLE];
  return value === undefined || value === '' ? null : value;
}

export function isDevMode(env: Environment): boolean {
  return rendererDevUrl(env) !== null;
}

export function defaultRootPath(env: Environment): null | string {
  const value = env[DEFAULT_ROOT_VARIABLE];
  return value === undefined || value === '' ? null : value;
}
