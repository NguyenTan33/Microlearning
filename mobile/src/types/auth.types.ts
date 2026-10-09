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

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ForgotPasswordRequest {
  phoneNumber: string;
}

export interface ForgotPasswordResponse {
  message: string;
  otp: string;
}

export interface VerifyForgotPasswordOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface VerifyForgotPasswordOtpResponse {
  resetToken: string;
  userId: string;
  otp: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  resetToken: string;
  newPassword: string;
  confirmNewPassword: string;
}
