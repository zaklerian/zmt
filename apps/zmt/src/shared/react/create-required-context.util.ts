import { createContext, Provider, useContext } from 'react';

export function createRequiredContext<T>(name: string): {
  Provider: Provider<null | T>;
  useValue: () => T;
} {
  const Context = createContext<null | T>(null);

  function useValue(): T {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`${name} must be used inside its provider`);
    }
    return value;
  }

  return { Provider: Context.Provider, useValue };
}
