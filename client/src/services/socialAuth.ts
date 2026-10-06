// Dịch vụ xác thực mạng xã hội (Google, Facebook) tối ưu hóa cho Responsive Web & Mobile Web

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
}

// Cấu hình Client IDs từ biến môi trường
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '495162190017-dt0ob70in2dusthjocmmpqsouootmal7.apps.googleusercontent.com';

export const FACEBOOK_APP_ID =
  import.meta.env.VITE_FACEBOOK_APP_ID ||
  '1376557287882064';

/**
 * Tạo URL ủy quyền Google OpenID Connect chuẩn
 */
export function getGoogleOAuthUrl(): string {
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=id_token&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `nonce=${encodeURIComponent(nonce)}&` +
    `prompt=select_account`
  );
}

/**
 * Chuyển hướng toàn trang sang Google Sign-In (Khuyên dùng và bắt buộc cho Mobile Web để tránh bị chặn popup)
 */
export function redirectToGoogleLogin(): void {
  sessionStorage.setItem('oauth_in_progress', 'google');
  window.location.href = getGoogleOAuthUrl();
}

/**
 * Kiểm tra và lấy ID Token tạm thời sau khi redirect quay trở lại từ Google
 */
export function getAndClearPendingOAuthToken(): { idToken: string | null; error: string | null } {
  if (typeof window === 'undefined') return { idToken: null, error: null };

  // 1. Kiểm tra hash URL (nếu Google redirect trực tiếp về URL chính)
  const hash = window.location.hash.substring(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const hashIdToken = params.get('id_token');
    const hashError = params.get('error') || params.get('error_description');
    if (hashIdToken || hashError) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return { idToken: hashIdToken, error: hashError };
    }
  }

  // 2. Kiểm tra localStorage được lưu bởi /oauth-callback.html
  const idToken = localStorage.getItem('temp_oauth_id_token');
  const error = localStorage.getItem('temp_oauth_error');

  if (idToken) {
    localStorage.removeItem('temp_oauth_id_token');
  }
  if (error) {
    localStorage.removeItem('temp_oauth_error');
  }

  return { idToken, error };
}

/**
 * Helper mở popup trên Desktop với cơ chế tự động fallback sang Redirect nếu bị trình duyệt chặn
 */
function openOAuthPopup(
  url: string,
  title: string,
  tokenKey: 'idToken' | 'accessToken',
  fallbackRedirectFn?: () => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    let popup: Window | null = null;
    try {
      popup = window.open(
        url,
        title,
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes`
      );
    } catch {
      popup = null;
    }

    // Nếu popup bị trình duyệt chặn (hoặc trên Mobile không hỗ trợ cửa sổ con)
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      if (fallbackRedirectFn) {
        fallbackRedirectFn();
        return; // Đang chuyển hướng
      }
      reject(new Error('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để tiếp tục đăng nhập.'));
      return;
    }

    let isResolved = false;

    // Lắng nghe postMessage từ oauth-callback.html
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === 'OAUTH_RESPONSE') {
        window.removeEventListener('message', messageHandler);
        clearInterval(checkClosedInterval);
        isResolved = true;

        if (event.data.error) {
          reject(new Error(`Đăng nhập thất bại: ${event.data.error}`));
          return;
        }

        const token = event.data[tokenKey];
        if (token) {
          resolve(token);
        } else {
          reject(new Error(`Không nhận được mã xác thực (${tokenKey}) từ máy chủ.`));
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Kiểm tra định kỳ xem học viên có tự tay đóng cửa sổ popup không
    const checkClosedInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosedInterval);
        window.removeEventListener('message', messageHandler);
        if (!isResolved) {
          // Thử kiểm tra xem token đã được lưu vào localStorage chưa (đặc biệt khi mobile đổi tab)
          const pending = getAndClearPendingOAuthToken();
          if (pending.idToken && tokenKey === 'idToken') {
            resolve(pending.idToken);
            return;
          }
          reject(new Error('Cửa sổ đăng nhập đã đóng.'));
        }
      }
    }, 800);
  });
}

/**
 * Yêu cầu Google ID Token: Tự động rẽ nhánh Mobile (Full Redirect) hoặc Desktop (Popup + Fallback)
 */
export async function requestGoogleIdToken(): Promise<string> {
  // 1. Trên Mobile Web: Không dùng popup để loại bỏ hoàn toàn lỗi "văng web / popup blocked"
  if (isMobileDevice()) {
    redirectToGoogleLogin();
    return new Promise(() => {}); // Chờ chuyển trang
  }

  // 2. Trên Desktop: Mở popup, nếu bị chặn thì tự động fallback sang full redirect
  const googleAuthUrl = getGoogleOAuthUrl();
  return openOAuthPopup(googleAuthUrl, 'Đăng nhập bằng Google', 'idToken', redirectToGoogleLogin);
}

/**
 * Yêu cầu Facebook Access Token
 */
export async function requestFacebookAccessToken(): Promise<string> {
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const facebookAuthUrl =
    `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(FACEBOOK_APP_ID)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent('public_profile,email')}`;

  if (isMobileDevice()) {
    window.location.href = facebookAuthUrl;
    return new Promise(() => {});
  }

  return openOAuthPopup(facebookAuthUrl, 'Đăng nhập bằng Facebook', 'accessToken', () => {
    window.location.href = facebookAuthUrl;
  });
}

/**
 * Tạo token đăng nhập nhanh cho môi trường Mobile IP / Dev LAN
 */
export function createQuickGoogleToken(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  return `quick_google_${cleanEmail}`;
}
