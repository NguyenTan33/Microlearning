import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/secureStorage';
import { isTokenExpired } from '../utils/tokenHelper';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  },
});

export async function initializeApiBaseUrl(): Promise<string> {
  try {
    const customUrl = await secureStorage.getItem(STORAGE_KEYS.SERVER_URL);
    if (
      customUrl &&
      !customUrl.includes('192.168.') &&
      !customUrl.includes('localhost') &&
      !customUrl.includes('127.0.0.1') &&
      customUrl.startsWith('http')
    ) {
      const clean = customUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
      apiClient.defaults.baseURL = clean;
      return clean;
    } else if (customUrl) {
      // Dọn dẹp URL nội bộ cũ
      await secureStorage.removeItem(STORAGE_KEYS.SERVER_URL);
    }
  } catch {
    // fallback
  }
  apiClient.defaults.baseURL = API_BASE_URL;
  return API_BASE_URL;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const trimmed = url.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  apiClient.defaults.baseURL = trimmed;
  await secureStorage.setItem(STORAGE_KEYS.SERVER_URL, trimmed);
}

export function getApiBaseUrl(): string {
  return apiClient.defaults.baseURL || API_BASE_URL;
}

// Auto init on module load
initializeApiBaseUrl();

type SessionExpiredCallback = () => void;
const sessionExpiredCallbacks: SessionExpiredCallback[] = [];

export function onSessionExpired(cb: SessionExpiredCallback) {
  sessionExpiredCallbacks.push(cb);
  return () => {
    const idx = sessionExpiredCallbacks.indexOf(cb);
    if (idx > -1) sessionExpiredCallbacks.splice(idx, 1);
  };
}

export function notifySessionExpired() {
  sessionExpiredCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('[apiClient] Session expired callback error:', e);
    }
  });
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

const isAuthBypassUrl = (url?: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/api/auth/login') ||
    lower.includes('/api/auth/register') ||
    lower.includes('/api/auth/refresh') ||
    lower.includes('/api/auth/verify-otp') ||
    lower.includes('/api/auth/forgot-password') ||
    lower.includes('/api/auth/reset-password')
  );
};

// Request Interceptor: Attach Bearer Token & Proactive Refresh if expired
apiClient.interceptors.request.use(
  async (config) => {
    let token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // Kiểm tra chủ động trước khi gửi: nếu token đã hết hạn và có refreshToken -> silent refresh trước
    if (token && !isAuthBypassUrl(config.url) && isTokenExpired(token) && !isRefreshing) {
      const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const currentBase = getApiBaseUrl();
          const res = await axios.post(`${currentBase}/api/Auth/refresh`, { refreshToken });
          const newTok = res.data?.accessToken || res.data?.AccessToken;
          const newRef = res.data?.refreshToken || res.data?.RefreshToken;
          if (newTok) {
            token = newTok as string;
            await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
            if (newRef) {
              await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRef);
            }
            apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
          }
        } catch {
          // Bỏ qua lỗi proactive, để request tiếp tục và xử lý ở response interceptor nếu 401
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401 & Auto Logout when expired
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      if (isAuthBypassUrl(originalRequest?.url)) {
        return Promise.reject(error);
      }

      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const currentBase = getApiBaseUrl();
          const res = await axios.post(`${currentBase}/api/Auth/refresh`, {
            refreshToken,
          });

          const newAccessToken = res.data?.accessToken || res.data?.AccessToken;
          const newRefreshToken = res.data?.refreshToken || res.data?.RefreshToken;

          if (!newAccessToken) {
            throw new Error('Refresh token response missing access token');
          }

          await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          if (newRefreshToken) {
            await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          delete apiClient.defaults.headers.common.Authorization;
          notifySessionExpired();
          return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
        } finally {
          isRefreshing = false;
        }
      } else {
        // Đã thử lại nhưng vẫn 401 -> Session không còn hợp lệ
        await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        delete apiClient.defaults.headers.common.Authorization;
        notifySessionExpired();
        return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
      }
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error(error.response?.data?.message || 'Bạn không có quyền thực hiện thao tác này.'));
    }

    return Promise.reject(error);
  }
);
