import React, { useState } from 'react';
import type { AuthMode, LoginRequest, RegisterRequest, ResetPasswordRequest } from '../../types/auth.types';
import { authApi } from '../../services/authApi';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { OtpVerifyForm } from './OtpVerifyForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { SocialAuthButtons } from './SocialAuthButtons';
import { CheckCircle2 } from 'lucide-react';

export const AuthActionCard: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'Register' | 'ForgotPassword'>('Register');

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const clearMessages = () => {
    setServerError(null);
    setSuccessNotice(null);
  };

  // 1. Handle Login
  const handleLogin = async (data: LoginRequest) => {
    clearMessages();
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      setSuccessNotice('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Đăng nhập không thành công');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegister = async (data: RegisterRequest) => {
    clearMessages();
    setIsLoading(true);
    try {
      await authApi.register(data);
      setPhoneNumber(data.phoneNumber);
      setOtpPurpose('Register');
      setMode('VERIFY_OTP');
      setSuccessNotice('Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt tài khoản.');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotPassword = async (phone: string) => {
    clearMessages();
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ phoneNumber: phone });
      setPhoneNumber(phone);
      setOtpPurpose('ForgotPassword');
      setMode('VERIFY_OTP');
      setSuccessNotice('Mã xác thực đã được gửi đến số điện thoại của bạn.');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Gửi mã xác thực thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle OTP Verification
  const handleOtpSubmit = async (otp: string) => {
    clearMessages();
    setIsLoading(true);
    try {
      if (otpPurpose === 'Register') {
        await authApi.verifyRegisterOtp({ phoneNumber, otp });
        setMode('LOGIN');
        setSuccessNotice('Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
      } else {
        const response = await authApi.verifyForgotPasswordOtp({ phoneNumber, otp });
        setResetToken(response.resetToken || response.otp);
        setMode('RESET_PASSWORD');
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Xác thực mã OTP thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Resend OTP
  const handleResendOtp = async () => {
    clearMessages();
    try {
      await authApi.resendOtp({ phoneNumber, purpose: otpPurpose });
      setSuccessNotice('Mã OTP mới đã được gửi lại!');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP');
    }
  };

  // 6. Handle Reset Password
  const handleResetPassword = async (data: ResetPasswordRequest) => {
    clearMessages();
    setIsLoading(true);
    try {
      await authApi.resetPassword(data);
      setMode('LOGIN');
      setSuccessNotice('Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  // 7. Social Logins
  const handleGoogleLogin = async () => {
    clearMessages();
    setIsGoogleLoading(true);
    try {
      const { requestGoogleIdToken } = await import('../../services/socialAuth');
      const idToken = await requestGoogleIdToken();

      setSuccessNotice('Đang xác thực tài khoản Google với hệ thống...');
      const response = await authApi.googleLogin({ idToken });

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      setSuccessNotice('Đăng nhập bằng Google thành công! Đang chuyển hướng...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    clearMessages();
    setIsFacebookLoading(true);
    try {
      const { requestFacebookAccessToken } = await import('../../services/socialAuth');
      const accessToken = await requestFacebookAccessToken();

      setSuccessNotice('Đang xác thực tài khoản Facebook với hệ thống...');
      const response = await authApi.facebookLogin({ accessToken });

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      setSuccessNotice('Đăng nhập bằng Facebook thành công! Đang chuyển hướng...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Đăng nhập Facebook thất bại.');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[450px] mx-auto relative z-10">
      <div className="rounded-3xl bg-[#0B1020]/90 border border-white/10 p-7 sm:p-9 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl">
        <div className="mb-6 space-y-1">
          <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-white">
            {mode === 'LOGIN' && 'Đăng nhập'}
            {mode === 'REGISTER' && 'Đăng ký tài khoản'}
            {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
            {mode === 'VERIFY_OTP' && 'Xác thực OTP'}
            {mode === 'RESET_PASSWORD' && 'Đặt lại mật khẩu'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'LOGIN' && 'Chào mừng bạn quay trở lại MicroLearn!'}
            {mode === 'REGISTER' && 'Bắt đầu hành trình học tập đa môn ngay hôm nay'}
            {mode === 'FORGOT_PASSWORD' && 'Nhập số điện thoại để nhận mã xác thực'}
            {mode === 'VERIFY_OTP' && 'Bảo mật tài khoản thông qua mã xác nhận'}
            {mode === 'RESET_PASSWORD' && 'Tạo mật khẩu mới cho tài khoản của bạn'}
          </p>
        </div>

        {successNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {mode === 'LOGIN' && (
          <LoginForm
            onSubmit={handleLogin}
            onNavigateToRegister={() => {
              clearMessages();
              setMode('REGISTER');
            }}
            onNavigateToForgotPassword={() => {
              clearMessages();
              setMode('FORGOT_PASSWORD');
            }}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {mode === 'REGISTER' && (
          <RegisterForm
            onSubmit={handleRegister}
            onNavigateToLogin={() => {
              clearMessages();
              setMode('LOGIN');
            }}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {mode === 'FORGOT_PASSWORD' && (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBackToLogin={() => {
              clearMessages();
              setMode('LOGIN');
            }}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {mode === 'VERIFY_OTP' && (
          <OtpVerifyForm
            phoneNumber={phoneNumber}
            purpose={otpPurpose}
            onSubmit={handleOtpSubmit}
            onResendOtp={handleResendOtp}
            onBack={() => {
              clearMessages();
              setMode(otpPurpose === 'Register' ? 'REGISTER' : 'FORGOT_PASSWORD');
            }}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {mode === 'RESET_PASSWORD' && (
          <ResetPasswordForm
            phoneNumber={phoneNumber}
            resetToken={resetToken}
            onSubmit={handleResetPassword}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <SocialAuthButtons
            onGoogleClick={handleGoogleLogin}
            onFacebookClick={handleFacebookLogin}
            disabled={isLoading}
            isGoogleLoading={isGoogleLoading}
            isFacebookLoading={isFacebookLoading}
          />
        )}
      </div>
    </div>
  );
};
