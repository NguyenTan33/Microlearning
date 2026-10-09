export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number;
  user: User;
}

export interface LoginRequest {
  phoneNumber: string;
  passwordHash: string;
}

export interface RegisterRequest {
  fullName: string;
  phoneNumber: string;
  passwordHash: string;
}

export interface OtpVerifyRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface DeviceRegisterRequest {
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
}
