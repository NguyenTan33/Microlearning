import { create } from 'zustand';
import { tokenService } from '../services/tokenService';
import type { UserProfile } from '../types/auth.types';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  initAuth: () => Promise<void>;
  loginSuccess: (accessToken: string, refreshToken: string, userOverride?: Partial<UserProfile>) => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  isAdmin: false,
  isTeacher: false,

  initAuth: async () => {
    try {
      const token = await tokenService.getAccessToken();
      const user = await tokenService.getUserInfo();
      if (token && user) {
        const roles = user.roles || [];
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

  loginSuccess: async (accessToken, refreshToken, userOverride) => {
    await tokenService.saveTokens(accessToken, refreshToken);
    
    // Parse real profile from JWT
    const jwtUser = tokenService.parseJwt(accessToken);
    
    const finalUser: UserProfile = {
      id: userOverride?.id || jwtUser?.id || 'user-current',
      fullName: userOverride?.fullName || jwtUser?.fullName || 'Học viên',
      phoneNumber: userOverride?.phoneNumber || jwtUser?.phoneNumber || '',
      roles: userOverride?.roles || jwtUser?.roles || ['Student'],
      email: userOverride?.email || jwtUser?.email,
      avatarUrl: userOverride?.avatarUrl || jwtUser?.avatarUrl,
    };

    // Special check for Admin phone +84999999999 or Teacher +84888888888
    if (finalUser.phoneNumber.includes('999999999') && !finalUser.roles.includes('Admin')) {
      finalUser.roles = ['Admin', 'Teacher', 'Student'];
    } else if (finalUser.phoneNumber.includes('888888888') && !finalUser.roles.includes('Teacher')) {
      finalUser.roles = ['Teacher', 'Student'];
    }

    const isAdmin = finalUser.roles.includes('Admin');
    const isTeacher = isAdmin || finalUser.roles.includes('Teacher');

    await tokenService.saveUserInfo(finalUser);
    set({ isAuthenticated: true, user: finalUser, isAdmin, isTeacher });
  },

  updateProfile: async (updated) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const finalUser = { ...currentUser, ...updated };
    const isAdmin = finalUser.roles.includes('Admin');
    const isTeacher = isAdmin || finalUser.roles.includes('Teacher');

    await tokenService.saveUserInfo(finalUser);
    set({ user: finalUser, isAdmin, isTeacher });
  },

  logout: async () => {
    await tokenService.clearTokens();
    set({ isAuthenticated: false, user: null, isAdmin: false, isTeacher: false });
  },
}));
