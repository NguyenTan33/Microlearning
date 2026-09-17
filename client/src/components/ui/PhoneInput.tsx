import React from 'react';
import { Smartphone, ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Nhập số điện thoại',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d+ ]/g, '');
    onChange(raw);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#FFF3C4]">
        Số điện thoại
      </label>

      <div
        className={`relative flex items-center rounded-xl bg-[#09110B]/85 border transition-all duration-200 focus-within:ring-2 ${
          error
            ? 'border-rose-500/80 focus-within:ring-rose-500/20 focus-within:border-rose-500'
            : 'border-[#C5A059]/40 focus-within:border-[#E6C687] focus-within:ring-[#C5A059]/30'
        }`}
      >
        {/* Vietnamese Flag Prefix */}
        <div className="flex items-center gap-1.5 pl-3 pr-2.5 py-3 border-r border-[#C5A059]/30 text-stone-200 text-sm select-none">
          <span className="text-base" role="img" aria-label="Vietnam Flag">🇻🇳</span>
          <span className="font-semibold text-xs text-[#FFF3C4]">+84</span>
          <ChevronDown className="w-3 h-3 text-stone-400" />
        </div>

        <input
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-stone-400 focus:outline-none disabled:opacity-50"
        />

        <div className="pr-3.5 text-[#C5A059]/80">
          <Smartphone className="w-4 h-4" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-medium pl-1">
          {error}
        </p>
      )}
    </div>
  );
};
