import React, { useRef, useEffect } from 'react';

interface OtpInputGroupProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: string;
}

export const OtpInputGroup: React.FC<OtpInputGroupProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const firstEmptyIndex = value.length < length ? value.length : length - 1;
    inputRefs.current[firstEmptyIndex]?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const char = val[val.length - 1];
    const otpArray = value.split('');
    otpArray[index] = char;
    const newOtp = otpArray.join('').slice(0, length);
    onChange(newOtp);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const otpArray = value.split('');
      if (otpArray[index]) {
        otpArray[index] = '';
      } else if (index > 0) {
        otpArray[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      onChange(otpArray.join(''));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const nextFocus = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => {
          const digit = value[i] || '';
          return (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleInputChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`w-12 h-14 sm:w-14 sm:h-14 text-center text-xl font-bold rounded-xl bg-slate-900/80 border transition-all duration-200 focus:outline-none ${
                error
                  ? 'border-rose-500/80 text-rose-300 focus:ring-2 focus:ring-rose-500/20'
                  : digit
                  ? 'border-indigo-500 text-white bg-indigo-950/30'
                  : 'border-white/10 text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-400 font-medium text-center">{error}</p>}
    </div>
  );
};
