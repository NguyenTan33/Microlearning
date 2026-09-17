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
  fullName: string;
  phoneNumber: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  message: string;
}

export interface VerifyRegisterOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface VerifyRegisterOtpResponse {
  userId: string;
  message: string;
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

export interface ResendOtpRequest {
  phoneNumber: string;
  purpose: 'Register' | 'ForgotPassword';
}

export interface ResendOtpResponse {
  message: string;
  otp: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface FacebookLoginRequest {
  accessToken: string;
}

export type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'VERIFY_OTP' | 'RESET_PASSWORD';

export interface AuthState {
  mode: AuthMode;
  phoneNumber: string;
  resetToken?: string;
  otpPurpose?: 'Register' | 'ForgotPassword';
}
