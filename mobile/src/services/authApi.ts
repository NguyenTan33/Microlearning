import { apiClient } from './apiClient';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RegisterDeviceRequest,
  DeviceResponse,
} from '../types/auth.types';

export const authApi = {
  /**
   * Đăng nhập học viên
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response.data;
  },

  /**
   * Đăng ký tài khoản học viên mới
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', request);
    return response.data;
  },

  /**
   * Xác thực mã OTP sau khi đăng ký
   */
  async verifyOtp(request: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', request);
    return response.data;
  },

  /**
   * Đăng ký mã phần cứng thiết bị vào tài khoản học viên
   */
  async registerDevice(request: RegisterDeviceRequest): Promise<DeviceResponse> {
    const response = await apiClient.post<DeviceResponse>('/devices/register', request);
    return response.data;
  },
};
