import React, { useState } from 'react';
import { PhoneInput } from '../ui/PhoneInput';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSubmit: (phoneNumber: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  onBackToLogin,
  isLoading = false,
  serverError = null,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | undefined>();

  const validate = (): boolean => {
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!cleanPhone) {
      setError('Vui lòng nhập số điện thoại');
      return false;
    }
    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleanPhone)) {
      setError('Số điện thoại không đúng định dạng (03, 05, 07, 08, 09)');
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(phoneNumber.trim());
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
          if (error) setError(undefined);
        }}
        error={error}
        disabled={isLoading}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang gửi mã...</span>
          </>
        ) : (
          <>
            <span>Gửi mã xác nhận</span>
            <Send className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors focus:outline-none pt-2 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại Đăng nhập</span>
      </button>
    </form>
  );
};
