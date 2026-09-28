import { configureUserData, devUserDataPath, type UserDataApp } from './user-data.util';

function fakeApp(productionPath: string) {
  const setPath = vi.fn<UserDataApp['setPath']>();
  return { getPath: (): string => productionPath, setPath };
}

describe('configureUserData (ARCH-16)', () => {
  it('switches userData to a dev-specific directory before anything is persisted', () => {
    const app = fakeApp('/home/user/.config/zmt');
    expect(configureUserData(app, true)).toBe('/home/user/.config/zmt-dev');
    expect(app.setPath).toHaveBeenCalledExactlyOnceWith('userData', '/home/user/.config/zmt-dev');
  });

  it('keeps the production directory outside dev mode', () => {
    const app = fakeApp('/home/user/.config/zmt');
    expect(configureUserData(app, false)).toBe('/home/user/.config/zmt');
    expect(app.setPath).not.toHaveBeenCalled();
  });

  it('derives the dev path by suffix', () => {
    expect(devUserDataPath('C:\\Users\\me\\AppData\\Roaming\\zmt')).toBe(
      'C:\\Users\\me\\AppData\\Roaming\\zmt-dev',
    );
  });
});
