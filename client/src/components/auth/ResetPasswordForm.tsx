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
        id="reset-new-password"
        name="newPassword"
        autoComplete="new-password"
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
        id="reset-confirm-new-password"
        name="confirmNewPassword"
        autoComplete="new-password"
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
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang cập nhật...</span>
          </>
        ) : (
          <>
            <span>Cập nhật mật khẩu</span>
            <KeyRound className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
