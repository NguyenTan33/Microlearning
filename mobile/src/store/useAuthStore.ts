import { create } from 'zustand';
import type { User } from '../types/auth.types';
import { secureStorage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../utils/constants';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    await secureStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
    set({ isAuthenticated: true, user, isLoading: false });
  },

  logout: async () => {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.USER_INFO);
    set({ isAuthenticated: false, user: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userJson = await secureStorage.getItem(STORAGE_KEYS.USER_INFO);
      if (token && userJson) {
        set({ isAuthenticated: true, user: JSON.parse(userJson), isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
}));
