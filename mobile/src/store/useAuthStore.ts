import { create } from 'zustand';
import { tokenService } from '../services/tokenService';

interface UserInfo {
  id: string;
  fullName: string;
  phoneNumber: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  loginSuccess: (accessToken: string, refreshToken: string, user: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  initAuth: async () => {
    try {
      const token = await tokenService.getAccessToken();
      const user = await tokenService.getUserInfo();
      if (token && user) {
        set({ isAuthenticated: true, user, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },

  loginSuccess: async (accessToken, refreshToken, user) => {
    await tokenService.saveTokens(accessToken, refreshToken);
    await tokenService.saveUserInfo(user);
    set({ isAuthenticated: true, user });
  },

  logout: async () => {
    await tokenService.clearTokens();
    set({ isAuthenticated: false, user: null });
  },
}));
