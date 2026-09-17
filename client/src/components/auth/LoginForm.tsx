import React, { useState } from 'react';
import { PhoneInput } from '../ui/PhoneInput';
import { PasswordInput } from '../ui/PasswordInput';
import { LogIn, Loader2 } from 'lucide-react';
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
  const [rememberMe, setRememberMe] = useState(false);
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
      {serverError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          {serverError}
        </div>
      )}

      <PhoneInput
        value={phoneNumber}
        onChange={(val) => {
          setPhoneNumber(val);
          if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
        }}
        error={errors.phoneNumber}
        disabled={isLoading}
      />

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
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        }
      />

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0"
          />
          <span className="text-xs text-slate-300">Ghi nhớ đăng nhập</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <LogIn className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 pt-1">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
        >
          Đăng ký ngay
        </button>
      </p>
    </form>
  );
};
