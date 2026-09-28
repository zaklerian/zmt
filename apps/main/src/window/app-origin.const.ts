import { type Environment, rendererDevUrl } from '../app/dev-mode.util';

export const APP_SCHEME = 'zmt';

export const APP_HOST = 'renderer';

export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const APP_INDEX_URL = `${APP_ORIGIN}/index.html`;

export function resolveAppOrigin(env: Environment): string {
  const devUrl = rendererDevUrl(env);
  return devUrl === null ? APP_ORIGIN : new URL(devUrl).origin;
}

export function resolveStartUrl(env: Environment): string {
  return rendererDevUrl(env) ?? APP_INDEX_URL;
}
