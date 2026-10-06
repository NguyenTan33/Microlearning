import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS_TOKEN = 'ML_ACCESS_TOKEN';
const KEY_REFRESH_TOKEN = 'ML_REFRESH_TOKEN';
const KEY_USER_INFO = 'ML_USER_INFO';

export const tokenService = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEY_USER_INFO);
  },

  async saveUserInfo(info: { id: string; fullName: string; phoneNumber: string }): Promise<void> {
    await SecureStore.setItemAsync(KEY_USER_INFO, JSON.stringify(info));
  },

  async getUserInfo(): Promise<{ id: string; fullName: string; phoneNumber: string } | null> {
    const raw = await SecureStore.getItemAsync(KEY_USER_INFO);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
