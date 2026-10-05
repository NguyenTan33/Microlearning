/**
 * Interceptor tự động ánh xạ các yêu cầu /api, /Videos, /Audios 
 * sang Azure Backend khi ứng dụng chạy ở môi trường Production (Azure Static Web Apps).
 */
export function setupApiInterceptor() {
  const BACKEND_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net' : '')
  ).replace(/\/$/, '');

  if (!BACKEND_BASE) return;

  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/Audios') || input.startsWith('/Videos')) {
        return originalFetch(`${BACKEND_BASE}${input}`, init);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api') || input.pathname.startsWith('/Audios') || input.pathname.startsWith('/Videos')) {
        return originalFetch(`${BACKEND_BASE}${input.pathname}${input.search}`, init);
      }
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      const url = new URL(input.url);
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/Audios') || url.pathname.startsWith('/Videos')) {
        const newRequest = new Request(`${BACKEND_BASE}${url.pathname}${url.search}`, input);
        return originalFetch(newRequest, init);
      }
    }

    return originalFetch(input, init);
  };
}
