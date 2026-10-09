import * as WebBrowser from 'expo-web-browser';
import { authApi } from './authApi';
import type { AuthTokenResponse } from '../types/auth.types';
import { API_BASE_URL, AZURE_CLOUD_URL } from '../utils/constants';

// Cho phép WebBrowser tự động hoàn tất phiên OAuth nếu chạy trên Web hoặc deep-link
WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = '495162190017-dt0ob70in2dusthjocmmpqsouootmal7.apps.googleusercontent.com';
export const FACEBOOK_APP_ID = '1376557287882064';

// Endpoint callback trung gian trên Azure để kích hoạt deep link về app
const OAUTH_REDIRECT_URI = `${API_BASE_URL || AZURE_CLOUD_URL}/api/Auth/oauth-callback`;

/**
 * Trích xuất tham số từ URL trả về sau khi OAuth hoàn tất (hỗ trợ cả hash fragment và query params)
 */
function extractTokenFromUrl(url: string, key: string): string | null {
  try {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    const paramString = hashIndex !== -1 ? url.substring(hashIndex + 1) : queryIndex !== -1 ? url.substring(queryIndex + 1) : '';

    if (!paramString) return null;

    const params = new URLSearchParams(paramString);
    return params.get(key);
  } catch {
    return null;
  }
}

/**
 * Khởi chạy phiên đăng nhập Google OAuth qua trình duyệt hệ thống
 */
export async function startGoogleOAuth(): Promise<{ success: boolean; data?: AuthTokenResponse; error?: string; cancelled?: boolean }> {
  try {
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
      `response_type=id_token&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `nonce=${encodeURIComponent(nonce)}&` +
      `prompt=select_account`;

    const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, 'microlearning://oauth-callback');

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true };
    }

    if (result.type === 'success' && result.url) {
      const idToken = extractTokenFromUrl(result.url, 'id_token');
      if (idToken) {
        const authData = await authApi.googleLogin({ idToken });
        return { success: true, data: authData };
      }
      const error = extractTokenFromUrl(result.url, 'error') || extractTokenFromUrl(result.url, 'error_description');
      if (error) {
        return { success: false, error: `Google OAuth: ${error}` };
      }
    }

    return { success: false, error: 'Không nhận được mã xác thực Google từ trình duyệt.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại.';
    return { success: false, error: msg };
  }
}

/**
 * Đăng nhập nhanh Google bằng Email (xác thực trực tiếp với Azure SQL backend)
 */
export async function loginGoogleByEmail(email: string): Promise<AuthTokenResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const idToken = `quick_google_${cleanEmail}`;
  return await authApi.googleLogin({ idToken });
}

/**
 * Khởi chạy phiên đăng nhập Facebook OAuth qua trình duyệt hệ thống
 */
export async function startFacebookOAuth(): Promise<{ success: boolean; data?: AuthTokenResponse; error?: string; cancelled?: boolean }> {
  try {
    const facebookAuthUrl =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${encodeURIComponent(FACEBOOK_APP_ID)}&` +
      `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent('public_profile,email')}`;

    const result = await WebBrowser.openAuthSessionAsync(facebookAuthUrl, 'microlearning://oauth-callback');

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true };
    }

    if (result.type === 'success' && result.url) {
      const accessToken = extractTokenFromUrl(result.url, 'access_token');
      if (accessToken) {
        const authData = await authApi.facebookLogin({ accessToken });
        return { success: true, data: authData };
      }
      const error = extractTokenFromUrl(result.url, 'error') || extractTokenFromUrl(result.url, 'error_description');
      if (error) {
        return { success: false, error: `Facebook OAuth: ${error}` };
      }
    }

    return { success: false, error: 'Không nhận được mã xác thực Facebook từ trình duyệt.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Đăng nhập Facebook thất bại.';
    return { success: false, error: msg };
  }
}

/**
 * Đăng nhập nhanh Facebook bằng Tên/Email (xác thực trực tiếp với Azure SQL backend)
 */
export async function loginFacebookByIdentifier(identifier: string): Promise<AuthTokenResponse> {
  const cleanId = identifier.trim().toLowerCase();
  const accessToken = `quick_fb_${cleanId}`;
  return await authApi.facebookLogin({ accessToken });
}
