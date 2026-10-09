import { apiClient } from './apiClient';
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  OtpVerifyRequest,
  DeviceRegisterRequest,
} from '../types/auth.types';

export const authApi = {
  async login(data: LoginRequest): Promise<AuthTokenResponse> {
    const res = await apiClient.post<AuthTokenResponse>('/api/Auth/login', data);
    return res.data;
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
    const res = await apiClient.post<{ success: boolean }>('/api/devices/register', data);
    return res.data;
  },
};
