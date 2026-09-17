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
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7A1518] via-[#9E1B1E] to-[#7A1518] hover:from-[#8C181B] hover:via-[#B31E22] hover:to-[#8C181B] border border-[#FFDD55]/80 text-[#FFF9E6] font-bold text-sm shadow-[0_4px_20px_rgba(158,27,30,0.6)] hover:shadow-[0_4px_25px_rgba(255,221,85,0.4)] transition-all duration-300 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Đang gửi mã...</span>
          </>
        ) : (
          <>
            <span>Gửi mã xác nhận</span>
            <Send className="w-4 h-4 text-[#FFDD55]" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-stone-300 hover:text-[#FFDD55] transition-colors focus:outline-none pt-2 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại Đăng nhập</span>
      </button>
    </form>
  );
};
