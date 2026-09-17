import React, { useState } from 'react';
import { PhoneInput } from '../ui/PhoneInput';
import { PasswordInput } from '../ui/PasswordInput';
import { User, UserPlus, Loader2 } from 'lucide-react';
import type { RegisterRequest } from '../../types/auth.types';

interface RegisterFormProps {
  onSubmit: (data: RegisterRequest) => Promise<void>;
  onNavigateToLogin: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onNavigateToLogin,
  isLoading = false,
  serverError = null,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    if (!fullName.trim()) {
      err.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!cleanPhone) {
      err.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleanPhone)) {
      err.phoneNumber = 'Số điện thoại không đúng định dạng Việt Nam';
    }

    if (!password) {
      err.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      err.password = 'Mật khẩu phải có tối thiểu 6 ký tự';
    }

    if (password !== confirmPassword) {
      err.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!agreeTerms) {
      err.agreeTerms = 'Vui lòng đồng ý với điều khoản dịch vụ';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      fullName: fullName.trim(),
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

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Họ và tên
        </label>
        <div
          className={`relative flex items-center rounded-xl bg-slate-900/70 border transition-all duration-200 focus-within:ring-2 ${
            errors.fullName
              ? 'border-rose-500/80 focus-within:ring-rose-500/20 focus-within:border-rose-500'
              : 'border-white/10 focus-within:border-indigo-500 focus-within:ring-indigo-500/20'
          }`}
        >
          <div className="pl-3.5 text-slate-500">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            disabled={isLoading}
            placeholder="Nguyễn Văn A"
            className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        {errors.fullName && <p className="text-xs text-rose-400 font-medium pl-1">{errors.fullName}</p>}
      </div>

      <PhoneInput
        value={phoneNumber}
        onChange={(val) => {
          setPhoneNumber(val);
          if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
        }}
        error={errors.phoneNumber}
        disabled={isLoading}
      />

      <PasswordInput
        label="Mật khẩu"
        value={password}
        onChange={(val) => {
          setPassword(val);
          if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
        }}
        error={errors.password}
        disabled={isLoading}
        placeholder="Tối thiểu 6 ký tự"
      />

      <PasswordInput
        label="Xác nhận mật khẩu"
        value={confirmPassword}
        onChange={(val) => {
          setConfirmPassword(val);
          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        error={errors.confirmPassword}
        disabled={isLoading}
        placeholder="Nhập lại mật khẩu"
      />

      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: '' }));
            }}
            disabled={isLoading}
            className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-slate-400 leading-tight">
            Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư
          </span>
        </label>
        {errors.agreeTerms && (
          <p className="text-xs text-rose-400 font-medium pl-6 pt-1">{errors.agreeTerms}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7A1518] via-[#9E1B1E] to-[#7A1518] hover:from-[#8C181B] hover:via-[#B31E22] hover:to-[#8C181B] border border-[#FFDD55]/80 text-[#FFF9E6] font-bold text-sm shadow-[0_4px_20px_rgba(158,27,30,0.6)] hover:shadow-[0_4px_25px_rgba(255,221,85,0.4)] transition-all duration-300 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Đang tạo tài khoản...</span>
          </>
        ) : (
          <>
            <span>Đăng ký ngay</span>
            <UserPlus className="w-4 h-4 text-[#FFDD55]" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-stone-300 pt-1">
        Đã có tài khoản?{' '}
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="font-bold text-[#FFDD55] hover:text-amber-200 transition-colors focus:outline-none cursor-pointer underline underline-offset-2"
        >
          Đăng nhập
        </button>
      </p>
    </form>
  );
};
