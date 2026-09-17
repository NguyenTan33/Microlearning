import React, { useState, useEffect } from 'react';
import { OtpInputGroup } from '../ui/OtpInputGroup';
import { CheckCircle2, ArrowLeft, RotateCw, Loader2 } from 'lucide-react';

interface OtpVerifyFormProps {
  phoneNumber: string;
  purpose: 'Register' | 'ForgotPassword';
  onSubmit: (otp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

export const OtpVerifyForm: React.FC<OtpVerifyFormProps> = ({
  phoneNumber,
  purpose,
  onSubmit,
  onResendOtp,
  onBack,
  isLoading = false,
  serverError = null,
}) => {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    try {
      await onResendOtp();
      setCountdown(60);
      setOtp('');
      setError(undefined);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }
    setError(undefined);
    await onSubmit(otp);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-center space-y-1">
        <p className="text-xs text-slate-400">
          Mã xác thực gồm 6 chữ số để {purpose === 'Register' ? 'kích hoạt tài khoản' : 'khôi phục mật khẩu'} đã được gửi đến
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-semibold">
          <span>{phoneNumber}</span>
        </div>
      </div>

      {serverError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium text-center">
          {serverError}
        </div>
      )}

      <OtpInputGroup
        value={otp}
        onChange={(val) => {
          setOtp(val);
          if (error) setError(undefined);
        }}
        disabled={isLoading}
        error={error}
      />

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>Chưa nhận được mã?</span>
        {countdown > 0 ? (
          <span className="text-indigo-400 font-semibold font-mono">
            Gửi lại sau {countdown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
            <span>Gửi lại mã</span>
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || otp.length !== 6}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7A1518] via-[#9E1B1E] to-[#7A1518] hover:from-[#8C181B] hover:via-[#B31E22] hover:to-[#8C181B] border border-[#FFDD55]/80 text-[#FFF9E6] font-bold text-sm shadow-[0_4px_20px_rgba(158,27,30,0.6)] hover:shadow-[0_4px_25px_rgba(255,221,85,0.4)] transition-all duration-300 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Đang kiểm tra mã...</span>
          </>
        ) : (
          <>
            <span>Xác nhận</span>
            <CheckCircle2 className="w-4 h-4 text-[#FFDD55]" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-stone-300 hover:text-[#FFDD55] transition-colors focus:outline-none cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại</span>
      </button>
    </form>
  );
};
