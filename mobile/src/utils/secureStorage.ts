import * as SecureStore from 'expo-secure-store';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
    } catch (error) {
      console.error(`[SecureStore] Error writing key "${key}":`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, SECURE_OPTIONS);
    } catch (error) {
      console.warn(`[SecureStore] Error reading key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
    } catch (error) {
      console.error(`[SecureStore] Error deleting key "${key}":`, error);
    }
  },
};
