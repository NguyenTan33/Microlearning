import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '../types/auth.types';

const KEY_ACCESS_TOKEN = 'ML_ACCESS_TOKEN';
const KEY_REFRESH_TOKEN = 'ML_REFRESH_TOKEN';
const KEY_USER_INFO = 'ML_USER_INFO';

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
    
    // Polyfill atob if needed or use global atob
    const bufferHelper = (globalThis as unknown as { Buffer?: { from: (b: string, enc: string) => { toString: (e: string) => string } } }).Buffer;
    const jsonStr = typeof globalThis.atob === 'function'
      ? globalThis.atob(paddedBase64)
      : bufferHelper
      ? bufferHelper.from(paddedBase64, 'base64').toString('utf8')
      : '';
      
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

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

  async saveUserInfo(info: UserProfile): Promise<void> {
    await SecureStore.setItemAsync(KEY_USER_INFO, JSON.stringify(info));
  },

  async getUserInfo(): Promise<UserProfile | null> {
    const raw = await SecureStore.getItemAsync(KEY_USER_INFO);
    if (raw) {
      try {
        return JSON.parse(raw) as UserProfile;
      } catch {
        // Fallback to JWT parsing
      }
    }

    const token = await this.getAccessToken();
    if (!token) return null;

    const payload = parseJwtPayload(token);
    if (!payload) return null;

    const roleClaim =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] ||
      payload['roles'] ||
      [];

    const roles: string[] = Array.isArray(roleClaim) ? roleClaim : roleClaim ? [roleClaim] : ['Student'];

    const id =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload['sub'] ||
      payload['id'] ||
      'user-id';

    const fullName =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      payload['fullName'] ||
      payload['name'] ||
      'Học viên';

    const phoneNumber =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone'] ||
      payload['phoneNumber'] ||
      '';

    return {
      id,
      fullName,
      phoneNumber,
      roles,
    };
  },

  parseJwt(token: string): UserProfile | null {
    const payload = parseJwtPayload(token);
    if (!payload) return null;

    const roleClaim =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] ||
      payload['roles'] ||
      [];

    const roles: string[] = Array.isArray(roleClaim) ? roleClaim : roleClaim ? [roleClaim] : ['Student'];

    const id =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload['sub'] ||
      payload['id'] ||
      'user-id';

    const fullName =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      payload['fullName'] ||
      payload['name'] ||
      'Học viên';

    const phoneNumber =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone'] ||
      payload['phoneNumber'] ||
      '';

    return {
      id,
      fullName,
      phoneNumber,
      roles,
    };
  },
};
