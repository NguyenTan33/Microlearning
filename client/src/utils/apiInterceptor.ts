/**
 * Global Fetch Interceptor for EduSync Web:
 * 1. Tự động định tuyến sang Azure Backend khi chạy ở môi trường Production (hoặc VITE_BACKEND_URL).
 * 2. Tự động gắn Bearer Token từ localStorage vào tất cả các yêu cầu /api.
 * 3. Tự động làm mới Token (Silent Refresh qua /api/Auth/refresh) khi Access Token hết hạn (401).
 * 4. Nếu Refresh Token cũng hết hạn hoặc tài khoản bị vô hiệu hóa -> Xóa sạch bộ nhớ đệm và phát sự kiện `auth:session-expired`
 *    để chuyển ngay về màn hình Đăng nhập kèm thông báo rõ ràng cho người dùng.
 */

const BACKEND_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net' : '')
).replace(/\/$/, '');

let refreshPromise: Promise<string | null> | null = null;

function parseJwt(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, skewSeconds = 10): boolean {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || typeof decoded.exp !== 'number') return false;
  return (decoded.exp - skewSeconds) * 1000 < Date.now();
}

export function notifySessionExpired() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
}

const isAuthBypassUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return (
    lower.includes('/api/auth/login') ||
    lower.includes('/api/auth/register') ||
    lower.includes('/api/auth/refresh') ||
    lower.includes('/api/auth/forgot-password') ||
    lower.includes('/api/auth/verify-otp') ||
    lower.includes('/api/auth/verify-forgot-password-otp') ||
    lower.includes('/api/auth/resend-otp') ||
    lower.includes('/api/auth/reset-password') ||
    lower.includes('/api/auth/google-login') ||
    lower.includes('/api/auth/facebook-login')
  );
};

export function setupApiInterceptor() {
  const originalFetch = window.fetch;

  async function performTokenRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      notifySessionExpired();
      return null;
    }

    const refreshUrl = BACKEND_BASE ? `${BACKEND_BASE}/api/Auth/refresh` : '/api/Auth/refresh';

    try {
      const res = await originalFetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        notifySessionExpired();
        return null;
      }

      const data = await res.json();
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return data.accessToken as string;
      }

      notifySessionExpired();
      return null;
    } catch (err) {
      console.error('[Interceptor] Lỗi khi làm mới token:', err);
      notifySessionExpired();
      return null;
    }
  }

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    let urlStr = '';
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      urlStr = input.url;
    }

    // 1. Ánh xạ URL sang Azure Backend nếu ở môi trường Production
    let targetInput: RequestInfo | URL = input;
    if (BACKEND_BASE) {
      if (typeof input === 'string') {
        if (input.startsWith('/api') || input.startsWith('/Audios') || input.startsWith('/Videos')) {
          targetInput = `${BACKEND_BASE}${input}`;
        }
      } else if (input instanceof URL) {
        if (input.pathname.startsWith('/api') || input.pathname.startsWith('/Audios') || input.pathname.startsWith('/Videos')) {
          targetInput = `${BACKEND_BASE}${input.pathname}${input.search}`;
        }
      } else if (typeof Request !== 'undefined' && input instanceof Request) {
        const u = new URL(input.url);
        if (u.pathname.startsWith('/api') || u.pathname.startsWith('/Audios') || u.pathname.startsWith('/Videos')) {
          targetInput = new Request(`${BACKEND_BASE}${u.pathname}${u.search}`, input);
        }
      }
    }

    const isApi = urlStr.includes('/api/') || (typeof targetInput === 'string' && targetInput.includes('/api/'));
    const isBypass = isAuthBypassUrl(urlStr);

    // 2. Kiểm tra chủ động: Nếu token đã hết hạn trước khi gọi API, tự động refresh trước
    let activeToken = localStorage.getItem('accessToken');
    if (isApi && !isBypass && activeToken && isTokenExpired(activeToken)) {
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        activeToken = refreshed;
      }
    }

    // 3. Đảm bảo Authorization header được gắn vào request
    const headers = new Headers(
      init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : {})
    );
    if (isApi && !isBypass && activeToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }

    const effectiveInit: RequestInit = {
      ...init,
      headers,
    };

    // 4. Gửi yêu cầu ban đầu
    let response = await originalFetch(targetInput, effectiveInit);

    // 5. Bắt phản hồi 401 Unauthorized và tự động Refresh hoặc yêu cầu đăng nhập lại
    if (response.status === 401 && isApi && !isBypass) {
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshedToken = await refreshPromise;
      if (refreshedToken) {
        // Thử lại request với token mới vừa nhận được
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        const retryInit: RequestInit = {
          ...init,
          headers,
        };
        response = await originalFetch(targetInput, retryInit);

        if (response.status === 401) {
          notifySessionExpired();
        }
      } else {
        notifySessionExpired();
      }
    }

    return response;
  };
}
