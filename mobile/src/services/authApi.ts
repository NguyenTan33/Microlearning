import { apiClient } from './apiClient';
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  OtpVerifyRequest,
  DeviceRegisterRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyForgotPasswordOtpRequest,
  VerifyForgotPasswordOtpResponse,
  ResetPasswordRequest,
} from '../types/auth.types';

export const authApi = {
  async login(data: LoginRequest): Promise<AuthTokenResponse> {
    const res = await apiClient.post<AuthTokenResponse>('/api/Auth/login', data);
    return res.data;
  },

  async googleLogin(data: { idToken: string }): Promise<AuthTokenResponse> {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; expiresAt: string; user?: any }>('/api/Auth/google-login', data);
    return {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expiresAt: res.data.expiresAt,
      user: res.data.user || {
        id: '',
        fullName: 'Google User',
        phoneNumber: '',
      },
    };
  },

  async facebookLogin(data: { accessToken: string }): Promise<AuthTokenResponse> {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; expiresAt: string; user?: any }>('/api/Auth/facebook-login', data);
    return {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expiresAt: res.data.expiresAt,
      user: res.data.user || {
        id: '',
        fullName: 'Facebook User',
        phoneNumber: '',
      },
    };
  },

  async register(data: RegisterRequest): Promise<AuthTokenResponse> {
    const res = await apiClient.post<AuthTokenResponse>('/api/Auth/register', data);
    return res.data;
  },

  async verifyOtp(data: OtpVerifyRequest): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/api/Auth/verify-otp', data);
    return res.data;
  },

  async registerDevice(data: DeviceRegisterRequest): Promise<{ success: boolean }> {
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/devices/register', data);
      return res.data;
    } catch {
      return { success: false };
    }
  },

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/api/Auth/change-password', data);
    return res.data;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const res = await apiClient.post<ForgotPasswordResponse>('/api/Auth/forgot-password', data);
    return res.data;
  },

  async verifyForgotPasswordOtp(data: VerifyForgotPasswordOtpRequest): Promise<VerifyForgotPasswordOtpResponse> {
    const res = await apiClient.post<VerifyForgotPasswordOtpResponse>('/api/Auth/verify-forgot-password-otp', data);
    return res.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/api/Auth/reset-password', data);
    return res.data;
  },
};
