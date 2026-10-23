/** Web preview only: SecureStore has no web backend, so fall back to localStorage. */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const secureStorage = {
  get: async (key: string) => store()?.getItem(key) ?? null,
  set: async (key: string, value: string) => store()?.setItem(key, value),
  remove: async (key: string) => store()?.removeItem(key),
};
