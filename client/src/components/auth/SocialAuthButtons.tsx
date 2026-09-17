import React from 'react';
import { Loader2 } from 'lucide-react';

interface SocialAuthButtonsProps {
  onGoogleClick?: () => void;
  onFacebookClick?: () => void;
  disabled?: boolean;
  isGoogleLoading?: boolean;
  isFacebookLoading?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGoogleClick,
  onFacebookClick,
  disabled = false,
  isGoogleLoading = false,
  isFacebookLoading = false,
}) => {
  return (
    <div className="space-y-3 pt-1">
      {/* Subtle Divider matching image: "HOẶC TIẾP TỤC VỚI" */}
      <div className="relative flex items-center justify-center my-2">
        <div className="w-full border-t border-[#C5A059]/30" />
        <span className="absolute bg-[#0b140e] px-3 text-[11px] uppercase tracking-widest text-[#E6C687] font-serif font-bold">
          Hoặc tiếp tục với
        </span>
      </div>

      {/* Social Button Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Google Button */}
        <button
          type="button"
          onClick={onGoogleClick}
          disabled={disabled || isGoogleLoading}
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#09110B]/90 hover:bg-[#121E15] border border-[#C5A059]/40 hover:border-[#E6C687] text-white text-xs font-semibold transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          )}
          <span>{isGoogleLoading ? 'Đang kết nối...' : 'Google'}</span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          onClick={onFacebookClick}
          disabled={disabled || isFacebookLoading}
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#09110B]/90 hover:bg-[#121E15] border border-[#C5A059]/40 hover:border-[#E6C687] text-white text-xs font-semibold transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isFacebookLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" />
          ) : (
            <svg className="w-4 h-4 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>{isFacebookLoading ? 'Đang kết nối...' : 'Facebook'}</span>
        </button>
      </div>
    </div>
  );
};
