import axios from 'axios';
import { API_BASE_URL, AZURE_CLOUD_URL, STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/secureStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function initializeApiBaseUrl(): Promise<string> {
  try {
    const customUrl = await secureStorage.getItem(STORAGE_KEYS.SERVER_URL);
    if (
      customUrl &&
      !customUrl.includes('192.168.') &&
      !customUrl.includes('localhost') &&
      !customUrl.includes('127.0.0.1')
    ) {
      const clean = customUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
      apiClient.defaults.baseURL = clean;
      return clean;
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

// Request Interceptor: Attach Bearer Token & Ensure baseURL
apiClient.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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

        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;

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
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
