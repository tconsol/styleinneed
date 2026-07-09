import * as SecureStore from 'expo-secure-store';

// Secure, encrypted token storage (Keychain / Keystore).
const ACCESS = 'styleinneed_access_token';
const REFRESH = 'styleinneed_refresh_token';

export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  set: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
