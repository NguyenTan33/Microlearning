import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyRegisterOtpRequest,
  VerifyRegisterOtpResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyForgotPasswordOtpRequest,
  VerifyForgotPasswordOtpResponse,
  ResetPasswordRequest,
  ResendOtpRequest,
  ResendOtpResponse,
  GoogleLoginRequest,
  FacebookLoginRequest,
} from '../types/auth.types';

// Base API URL pointing to the ASP.NET Core backend (proxied via Vite /api or direct URL)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/Auth';

async function safeFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    console.error('Fetch error:', err);
    throw new Error('Không thể kết nối đến máy chủ Backend (.NET API). Bạn hãy khởi chạy backend trong Visual Studio (F5) nhé!');
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 504 || response.status === 502) {
    throw new Error('Máy chủ Backend (.NET API) chưa được khởi chạy hoặc cổng bị chặn.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.message || data?.title || 'Đã có lỗi xảy ra từ máy chủ.';
    throw new Error(errorMessage);
  }

  return data as T;
}

export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await safeFetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<LoginResponse>(response);
  },

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await safeFetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<RegisterResponse>(response);
  },

  async verifyRegisterOtp(request: VerifyRegisterOtpRequest): Promise<VerifyRegisterOtpResponse> {
    const response = await safeFetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<VerifyRegisterOtpResponse>(response);
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await safeFetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<ForgotPasswordResponse>(response);
  },

  async verifyForgotPasswordOtp(request: VerifyForgotPasswordOtpRequest): Promise<VerifyForgotPasswordOtpResponse> {
    const response = await safeFetch(`${API_BASE_URL}/verify-forgot-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<VerifyForgotPasswordOtpResponse>(response);
  },

  async resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await safeFetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<{ message: string }>(response);
  },

  async resendOtp(request: ResendOtpRequest): Promise<ResendOtpResponse> {
    const response = await safeFetch(`${API_BASE_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<ResendOtpResponse>(response);
  },

  async googleLogin(request: GoogleLoginRequest): Promise<LoginResponse> {
    const response = await safeFetch(`${API_BASE_URL}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<LoginResponse>(response);
  },

  async facebookLogin(request: FacebookLoginRequest): Promise<LoginResponse> {
    const response = await safeFetch(`${API_BASE_URL}/facebook-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<LoginResponse>(response);
  },
};
