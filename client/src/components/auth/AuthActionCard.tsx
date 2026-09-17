import React, { useState } from 'react';
import type { AuthMode, LoginRequest, RegisterRequest, ResetPasswordRequest } from '../../types/auth.types';
import { authApi } from '../../services/authApi';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { OtpVerifyForm } from './OtpVerifyForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { SocialAuthButtons } from './SocialAuthButtons';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
      setServerError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
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
      setServerError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
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
      setServerError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
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
      setServerError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto relative z-10 select-none">
      {/* Outer Arched Military Card Frame */}
      <div className="relative rounded-t-[54px] rounded-b-3xl bg-[#0B150F]/95 border-2 border-[#C5A059]/60 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.2)] backdrop-blur-2xl px-6 sm:px-8 pt-5 pb-8">
        {/* Ornate Gold Trim Corners & Inset Highlight */}
        <div className="absolute inset-1 rounded-t-[50px] rounded-b-[22px] border border-[#FFDD55]/20 pointer-events-none" />

        {/* 1. Crest at the top of the Arch: Golden Star with Laurel Wreath */}
        <div className="flex flex-col items-center justify-center -mt-2 mb-3">
          <div className="relative group cursor-pointer">
            {/* Ambient Golden Glow Behind Crest */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-600/30 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Crest SVG Badge */}
            <svg
              width="76"
              height="62"
              viewBox="0 0 76 62"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            >
              {/* Laurel Wreath Left Sprig */}
              <path
                d="M24 45C16 42 10 32 10 20C12 24 16 26 21 27C17 21 17 15 22 10C24 16 26 21 29 24C27 18 29 12 34 8C35 14 36 20 37 25"
                stroke="url(#laurelGold)"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              {/* Laurel Wreath Right Sprig (mirrored) */}
              <path
                d="M52 45C60 42 66 32 66 20C64 24 60 26 55 27C59 21 59 15 54 10C52 16 50 21 47 24C49 18 47 12 42 8C41 14 40 20 39 25"
                stroke="url(#laurelGold)"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Center Military Shield */}
              <path
                d="M38 12L49 17V33C49 41 44 47 38 50C32 47 27 41 27 33V17L38 12Z"
                fill="url(#shieldDark)"
                stroke="url(#laurelGold)"
                strokeWidth="1.8"
              />

              {/* Golden Five-Pointed Star */}
              <path
                d="M38 19L40.2 24.5L46 24.8L41.5 28.5L43.2 34.2L38 30.8L32.8 34.2L34.5 28.5L30 24.8L35.8 24.5L38 19Z"
                fill="url(#starGold)"
                stroke="#C5A059"
                strokeWidth="0.5"
                className="drop-shadow-[0_0_6px_rgba(255,221,85,0.8)]"
              />

              {/* Bottom Tied Ribbon */}
              <path
                d="M32 48C35 50 41 50 44 48L46 54C42 53 34 53 30 54L32 48Z"
                fill="url(#laurelGold)"
              />

              <defs>
                <linearGradient id="laurelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF2B2" />
                  <stop offset="50%" stopColor="#E6C687" />
                  <stop offset="100%" stopColor="#9C7729" />
                </linearGradient>
                <linearGradient id="shieldDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0B1A12" />
                  <stop offset="100%" stopColor="#040905" />
                </linearGradient>
                <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="30%" stopColor="#FFEA79" />
                  <stop offset="100%" stopColor="#D4A017" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* 2. Header Text */}
        <div className="mb-4 text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {mode === 'LOGIN' && 'Đăng nhập'}
            {mode === 'REGISTER' && 'Đăng ký tài khoản'}
            {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
            {mode === 'VERIFY_OTP' && 'Xác thực OTP'}
            {mode === 'RESET_PASSWORD' && 'Đặt lại mật khẩu'}
          </h2>
          <p className="text-xs text-stone-300">
            {mode === 'LOGIN' && 'Chào mừng bạn quay trở lại với MicroLearn!'}
            {mode === 'REGISTER' && 'Bắt đầu hành trình rèn luyện tri thức ngay hôm nay'}
            {mode === 'FORGOT_PASSWORD' && 'Nhập số điện thoại để nhận mã xác thực'}
            {mode === 'VERIFY_OTP' && 'Bảo mật tài khoản thông qua mã xác nhận'}
            {mode === 'RESET_PASSWORD' && 'Tạo mật khẩu mới cho tài khoản của bạn'}
          </p>
        </div>

        {/* 3. Notification Banners - Only appear on real events (success, loading, or error) */}
        {(successNotice || isGoogleLoading || serverError) && (
          <div className="space-y-2 mb-4">
            {/* Green Status Pill: Active Google login or operation success */}
            {(successNotice || isGoogleLoading) && (
              <div className="p-2.5 rounded-xl bg-[#0D2619] border border-[#10B981]/60 text-[#6EE7B7] text-xs font-medium flex items-center justify-between shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {successNotice || 'Đang xác thực tài khoản Google với hệ thống...'}
                  </span>
                </div>
              </div>
            )}

            {/* Red Alert Pill: Real system or validation error */}
            {serverError && (
              <div className="p-2.5 rounded-xl bg-[#2D1214] border border-[#EF4444]/60 text-[#FCA5A5] text-xs font-medium flex items-center justify-between shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{serverError}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Active Form */}
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

        {/* 5. Social Auth Buttons */}
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

      {/* Decorative Academy Architectural Plaque on Right */}
      <div className="hidden xl:block absolute -top-8 -right-14 z-0 pointer-events-none">
        <div className="bg-[#6B181B]/80 text-[#FFF3C4] border border-[#C5A059]/40 py-4 px-2 rounded-lg text-center shadow-lg transform rotate-2">
          <p className="font-serif font-bold text-[9px] tracking-widest leading-tight uppercase [writing-mode:vertical-rl]">
            Học để phụng sự Tổ quốc và Nhân dân
          </p>
        </div>
      </div>
    </div>
  );
};
