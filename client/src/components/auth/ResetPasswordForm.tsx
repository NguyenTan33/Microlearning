import React, { useState } from 'react';
import { PasswordInput } from '../ui/PasswordInput';
import { KeyRound, Loader2 } from 'lucide-react';
import type { ResetPasswordRequest } from '../../types/auth.types';

interface ResetPasswordFormProps {
  phoneNumber: string;
  resetToken: string;
  onSubmit: (data: ResetPasswordRequest) => Promise<void>;
  isLoading?: boolean;
  serverError?: string | null;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  phoneNumber,
  resetToken,
  onSubmit,
  isLoading = false,
  serverError = null,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const err: Record<string, string> = {};

    if (!newPassword) {
      err.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 6) {
      err.newPassword = 'Mật khẩu phải có tối thiểu 6 ký tự';
    }

    if (newPassword !== confirmNewPassword) {
      err.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      phoneNumber,
      resetToken,
      newPassword,
      confirmNewPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          {serverError}
        </div>
      )}

      <PasswordInput
        label="Mật khẩu mới"
        value={newPassword}
        onChange={(val) => {
          setNewPassword(val);
          if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
        }}
        error={errors.newPassword}
        disabled={isLoading}
        placeholder="Tối thiểu 6 ký tự"
      />

      <PasswordInput
        label="Xác nhận mật khẩu mới"
        value={confirmNewPassword}
        onChange={(val) => {
          setConfirmNewPassword(val);
          if (errors.confirmNewPassword) setErrors((prev) => ({ ...prev, confirmNewPassword: '' }));
        }}
        error={errors.confirmNewPassword}
        disabled={isLoading}
        placeholder="Nhập lại mật khẩu mới"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7A1518] via-[#9E1B1E] to-[#7A1518] hover:from-[#8C181B] hover:via-[#B31E22] hover:to-[#8C181B] border border-[#FFDD55]/80 text-[#FFF9E6] font-bold text-sm shadow-[0_4px_20px_rgba(158,27,30,0.6)] hover:shadow-[0_4px_25px_rgba(255,221,85,0.4)] transition-all duration-300 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Đang cập nhật...</span>
          </>
        ) : (
          <>
            <span>Cập nhật mật khẩu</span>
            <KeyRound className="w-4 h-4 text-[#FFDD55]" />
          </>
        )}
      </button>
    </form>
  );
};
