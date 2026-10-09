export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  roles?: string[];
  createdAt?: string;
}

export interface UserProfile extends User {
  roles?: string[];
}

export interface AdminUserItem {
  id: string;
  phoneNumber: string;
  fullName: string;
  roles: string[];
  isLocked: boolean;
  createdAt: string;
  email?: string;
}

export interface UpdateUserRoleRequest {
  userId: string;
  newRole: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  user: User;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  phoneNumber: string;
  password: string;
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

