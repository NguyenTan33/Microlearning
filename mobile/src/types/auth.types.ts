// Types cho Phân hệ Xác thực & Thiết bị trên Mobile

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  fullName: string;
}

export interface RegisterResponse {
  userId: string;
  message: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface VerifyOtpResponse {
  isSuccess: boolean;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterDeviceRequest {
  deviceIdentifier: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
}

export interface DeviceResponse {
  id: number;
  deviceIdentifier: string;
  deviceModel: string;
  osVersion: string;
  registeredAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  roles: string[];
}
