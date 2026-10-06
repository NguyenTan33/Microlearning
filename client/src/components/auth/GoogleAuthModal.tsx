import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { requestGoogleIdToken, createQuickGoogleToken, isMobileDevice } from '../../services/socialAuth';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (idToken: string) => Promise<void>;
  isLoading: boolean;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isLoading,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const handleOfficialGoogleLogin = async () => {
    setIsRedirecting(true);
    try {
      const idToken = await requestGoogleIdToken();
      if (idToken) {
        await onSuccess(idToken);
      }
    } catch (err: unknown) {
      setIsRedirecting(false);
      console.warn('Google OAuth popup thất bại, thử chế độ redirect hoặc email:', err);
    }
  };

  const handleQuickEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (!clean) {
      setEmailError('Vui lòng nhập địa chỉ email Google');
      return;
    }
    if (!clean.includes('@') || !clean.includes('.')) {
      setEmailError('Địa chỉ email không đúng định dạng');
      return;
    }

    setEmailError(null);
    const token = createQuickGoogleToken(clean);
    await onSuccess(token);
  };

  const handleSelectSampleEmail = (sample: string) => {
    setEmailInput(sample);
    setEmailError(null);
  };

  const isMobile = isMobileDevice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#0C1222] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/60 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-rose-500 to-amber-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isRedirecting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27A7.17 7.17 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.97 11.97 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Đăng nhập bằng Google</h3>
            <p className="text-xs text-slate-400">
              {isMobile ? 'Tối ưu cho thiết bị di động (Chống lỗi văng web)' : 'Đồng bộ hồ sơ và tiến độ học tập tức thì'}
            </p>
          </div>
        </div>

        {/* Option 1: Official Google OAuth Button */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleOfficialGoogleLogin}
            disabled={isLoading || isRedirecting}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading || isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Đang kết nối tới Google...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                <span>Tiếp tục với Tài khoản Google</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isMobile ? 'Chế độ chuyển hướng an toàn tự động cho Mobile Web' : 'Cửa sổ đăng nhập tiêu chuẩn'}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="w-full border-t border-white/10" />
          <span className="absolute bg-[#0C1222] px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Hoặc đăng nhập nhanh bằng Email
          </span>
        </div>

        {/* Option 2: Quick Email Sign-In (For Mobile LAN / IP / Direct connection) */}
        <form onSubmit={handleQuickEmailSubmit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Địa chỉ Gmail của bạn
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="vidu@gmail.com"
                disabled={isLoading || isRedirecting}
                className="w-full h-11 pl-10 pr-3.5 bg-[#070B17] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
            </div>
            {emailError && <p className="text-[11px] text-rose-400 font-medium">{emailError}</p>}
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Mẫu:
            </span>
            <button
              type="button"
              onClick={() => handleSelectSampleEmail('student.google@gmail.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 transition-colors cursor-pointer"
            >
              student.google@gmail.com
            </button>
            <button
              type="button"
              onClick={() => handleSelectSampleEmail('hocvien@gmail.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              hocvien@gmail.com
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || isRedirecting || !emailInput.trim()}
            className="w-full h-10 mt-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <span>Xác nhận đăng nhập với Email Google</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
