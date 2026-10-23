import * as SecureStore from 'expo-secure-store';

/** Small secrets (session, device id) in the iOS Keychain / Android Keystore. */
export const secureStorage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
