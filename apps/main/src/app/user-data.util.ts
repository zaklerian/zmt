export const DEV_USER_DATA_SUFFIX = '-dev';

export interface UserDataApp {
  readonly getPath: (name: 'userData') => string;
  readonly setPath: (name: 'userData', value: string) => void;
}

export function devUserDataPath(productionPath: string): string {
  return `${productionPath}${DEV_USER_DATA_SUFFIX}`;
}

export function configureUserData(app: UserDataApp, devMode: boolean): string {
  const productionPath = app.getPath('userData');
  if (!devMode) {
    return productionPath;
  }
  const devPath = devUserDataPath(productionPath);
  app.setPath('userData', devPath);
  return devPath;
}
