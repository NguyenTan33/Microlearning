import { create } from 'zustand';
import type { User } from '../types/auth.types';
import { secureStorage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../utils/constants';
import { getCurrentUserFromToken } from '../utils/tokenHelper';
import { apiClient } from '../services/apiClient';

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
    // 1. Phân tích Claims trực tiếp từ JWT Access Token để đảm bảo quyền Admin/Teacher chính xác 100%
    const tokenPayload = getCurrentUserFromToken(accessToken);

    const roles = tokenPayload?.roles?.length
      ? tokenPayload.roles
      : user.roles || (user.role ? [user.role] : ['Student']);

    const isAdmin = Boolean(tokenPayload?.isAdmin || roles.some((r) => r.toLowerCase() === 'admin'));
    const isTeacher = Boolean(isAdmin || tokenPayload?.isTeacher || roles.some((r) => r.toLowerCase() === 'teacher'));

    const effectiveUser: User = {
      ...user,
      id: tokenPayload?.userId || user.id,
      fullName: tokenPayload?.fullName || user.fullName || 'Học viên',
      phoneNumber: tokenPayload?.phoneNumber || user.phoneNumber || '',
      email: tokenPayload?.email || user.email,
      roles,
      role: isAdmin ? 'Admin' : isTeacher ? 'Teacher' : 'Student',
    };

    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    await secureStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(effectiveUser));

    // Đồng bộ tức thời Header Authorization cho Axios
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    set({ isAuthenticated: true, user: effectiveUser, isAdmin, isTeacher, isLoading: false });
  },

  logout: async () => {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.USER_INFO);

    delete apiClient.defaults.headers.common['Authorization'];

    set({ isAuthenticated: false, user: null, isAdmin: false, isTeacher: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userJson = await secureStorage.getItem(STORAGE_KEYS.USER_INFO);

      if (token) {
        const tokenPayload = getCurrentUserFromToken(token);
        let user: User | null = null;
        if (userJson) {
          try {
            user = JSON.parse(userJson) as User;
          } catch {
            // ignore
          }
        }

        const roles = tokenPayload?.roles?.length
          ? tokenPayload.roles
          : user?.roles || (user?.role ? [user.role] : ['Student']);

        const isAdmin = Boolean(tokenPayload?.isAdmin || roles.some((r) => r.toLowerCase() === 'admin'));
        const isTeacher = Boolean(isAdmin || tokenPayload?.isTeacher || roles.some((r) => r.toLowerCase() === 'teacher'));

        const effectiveUser: User = {
          id: tokenPayload?.userId || user?.id || 'user-1',
          fullName: tokenPayload?.fullName || user?.fullName || 'Học viên',
          phoneNumber: tokenPayload?.phoneNumber || user?.phoneNumber || '',
          email: tokenPayload?.email || user?.email,
          roles,
          role: isAdmin ? 'Admin' : isTeacher ? 'Teacher' : 'Student',
        };

        // Gắn header Authorization cho apiClient
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({ isAuthenticated: true, user: effectiveUser, isAdmin, isTeacher, isLoading: false });
      } else {
        delete apiClient.defaults.headers.common['Authorization'];
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
    const isAdmin = roles.some((r) => r.toLowerCase() === 'admin');
    const isTeacher = isAdmin || roles.some((r) => r.toLowerCase() === 'teacher');
    set({ user: updatedUser, isAdmin, isTeacher });
  },
}));
