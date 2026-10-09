import { create } from 'zustand';
import type { User } from '../types/auth.types';
import { secureStorage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../utils/constants';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isAdmin: boolean;
  isTeacher: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initAuth: () => Promise<void>;
  updateProfile: (partialUser: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  isAdmin: false,
  isTeacher: false,

  setAuth: async (user, accessToken, refreshToken) => {
    const roles = user.roles || (user.role ? [user.role] : ['Student']);
    const isAdmin = roles.includes('Admin');
    const isTeacher = isAdmin || roles.includes('Teacher');

    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    await secureStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
    set({ isAuthenticated: true, user, isAdmin, isTeacher, isLoading: false });
  },

  logout: async () => {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.USER_INFO);
    set({ isAuthenticated: false, user: null, isAdmin: false, isTeacher: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userJson = await secureStorage.getItem(STORAGE_KEYS.USER_INFO);
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        const roles = user.roles || (user.role ? [user.role] : ['Student']);
        const isAdmin = roles.includes('Admin');
        const isTeacher = isAdmin || roles.includes('Teacher');

        set({ isAuthenticated: true, user, isAdmin, isTeacher, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isAdmin: false, isTeacher: false, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isAdmin: false, isTeacher: false, isLoading: false });
    }
  },

  initAuth: async () => {
    await get().checkAuth();
  },

  updateProfile: async (partialUser: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...partialUser };
    await secureStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(updatedUser));
    const roles = updatedUser.roles || (updatedUser.role ? [updatedUser.role] : ['Student']);
    const isAdmin = roles.includes('Admin');
    const isTeacher = isAdmin || roles.includes('Teacher');
    set({ user: updatedUser, isAdmin, isTeacher });
  },
}));
