// Helper to open a centered OAuth popup window (matching TikTok, Shopee, etc.)
function openOAuthPopup(
  url: string,
  title: string,
  tokenKey: 'idToken' | 'accessToken'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      reject(new Error('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để tiếp tục đăng nhập.'));
      return;
    }

    let isResolved = false;

    // Listen for message from /oauth-callback.html
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

    // Check if user manually closed the popup without logging in
    const checkClosedInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosedInterval);
        window.removeEventListener('message', messageHandler);
        if (!isResolved) {
          reject(new Error('Bạn đã đóng cửa sổ đăng nhập.'));
        }
      }
    }, 800);
  });
}

/**
 * Standard Google OAuth 2.0 Flow
 * Opens the official Google accounts.google.com sign-in dialog in a popup window
 */
export async function requestGoogleIdToken(): Promise<string> {
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '495162190017-dt0ob70in2dusthjocmmpqsouootmal7.apps.googleusercontent.com';

  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Standard Google OpenID Connect authorization endpoint
  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=id_token&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `nonce=${encodeURIComponent(nonce)}&` +
    `prompt=select_account`;

  return openOAuthPopup(googleAuthUrl, 'Đăng nhập bằng Google', 'idToken');
}

/**
 * Standard Facebook OAuth 2.0 Flow
 * Opens the official Facebook dialog/oauth in a popup window
 */
export async function requestFacebookAccessToken(): Promise<string> {
  const appId =
    import.meta.env.VITE_FACEBOOK_APP_ID ||
    'YOUR_FACEBOOK_APP_ID';

  const redirectUri = `${window.location.origin}/oauth-callback.html`;

  // Standard Facebook Dialog OAuth endpoint
  const facebookAuthUrl =
    `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(appId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent('public_profile,email')}`;

  return openOAuthPopup(facebookAuthUrl, 'Đăng nhập bằng Facebook', 'accessToken');
}
