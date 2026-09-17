import React, { useState } from 'react';
import { PhoneInput } from '../ui/PhoneInput';
import { PasswordInput } from '../ui/PasswordInput';
import { Loader2 } from 'lucide-react';
import type { LoginRequest } from '../../types/auth.types';

interface LoginFormProps {
  onSubmit: (data: LoginRequest) => Promise<void>;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  isLoading = false,
  serverError = null,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ phoneNumber?: string; password?: string }>({});

  const validate = (): boolean => {
    const err: { phoneNumber?: string; password?: string } = {};
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    if (!cleanPhone) {
      err.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleanPhone)) {
      err.phoneNumber = 'Số điện thoại không đúng định dạng (03, 05, 07, 08, 09)';
    }

    if (!password) {
      err.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      err.password = 'Mật khẩu phải có tối thiểu 6 ký tự';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      phoneNumber: phoneNumber.trim(),
      password,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Phone Input with VN Flag */}
      <PhoneInput
        value={phoneNumber}
        onChange={(val) => {
          setPhoneNumber(val);
          if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
        }}
        error={errors.phoneNumber}
        disabled={isLoading}
      />

      {/* Password Input */}
      <PasswordInput
        label="Mật khẩu"
        value={password}
        onChange={(val) => {
          setPassword(val);
          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
        }}
        error={errors.password}
        disabled={isLoading}
        rightAction={
          <button
            type="button"
            onClick={onNavigateToForgotPassword}
            className="text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors focus:outline-none cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        }
      />

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-[#C5A059]/40 bg-[#09110B] text-amber-500 focus:ring-[#C5A059]/30 focus:ring-offset-0"
          />
          <span className="text-xs text-stone-300">Ghi nhớ đăng nhập</span>
        </label>
      </div>

      {/* Ceremonial Crimson Red Primary CTA Button with Golden Laurel Sprigs */}
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7A1518] via-[#9E1B1E] to-[#7A1518] hover:from-[#8C181B] hover:via-[#B31E22] hover:to-[#8C181B] border border-[#FFDD55]/80 text-[#FFF9E6] font-bold text-sm shadow-[0_4px_20px_rgba(158,27,30,0.6)] hover:shadow-[0_4px_25px_rgba(255,221,85,0.4)] transition-all duration-300 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer overflow-hidden"
      >
        {/* Animated Gold Sheen Sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Left Golden Laurel Sprig */}
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" className="text-[#FFDD55] shrink-0">
          <path
            d="M22 16C16 15 10 12 6 7 C5 9 3 11 1 12 C4 9 6 6 8 2 C10 6 13 8 16 9 C12 11 8 12 4 11 C8 13 14 15 22 16Z"
            fill="currentColor"
          />
          <path
            d="M12 4C14 2 17 3 18 5C16 6 13 5 12 4Z"
            fill="currentColor"
          />
        </svg>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span className="tracking-wide font-serif">Đang xử lý...</span>
          </div>
        ) : (
          <span className="tracking-wide font-serif text-base text-[#FFFCE8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Đăng nhập →
          </span>
        )}

        {/* Right Golden Laurel Sprig (mirrored) */}
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" className="text-[#FFDD55] shrink-0 scale-x-[-1]">
          <path
            d="M22 16C16 15 10 12 6 7 C5 9 3 11 1 12 C4 9 6 6 8 2 C10 6 13 8 16 9 C12 11 8 12 4 11 C8 13 14 15 22 16Z"
            fill="currentColor"
          />
          <path
            d="M12 4C14 2 17 3 18 5C16 6 13 5 12 4Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Footer Registration Link */}
      <p className="text-center text-xs text-stone-300 pt-0.5">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="font-bold text-[#FFDD55] hover:text-amber-200 transition-colors focus:outline-none cursor-pointer underline underline-offset-2"
        >
          Đăng ký ngay
        </button>
      </p>
    </form>
  );
};
