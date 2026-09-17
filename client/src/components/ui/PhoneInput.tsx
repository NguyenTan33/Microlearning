import React from 'react';
import { Smartphone } from 'lucide-react';

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
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        Số điện thoại
      </label>

      <div
        className={`relative flex items-center rounded-xl bg-slate-900/70 border transition-all duration-200 focus-within:ring-2 ${
          error
            ? 'border-rose-500/80 focus-within:ring-rose-500/20 focus-within:border-rose-500'
            : 'border-white/10 focus-within:border-indigo-500 focus-within:ring-indigo-500/20'
        }`}
      >
        <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3 border-r border-white/10 text-slate-300 text-sm select-none">
          <span className="text-base" role="img" aria-label="Vietnam Flag">🇻🇳</span>
          <span className="font-medium text-xs text-slate-300">+84</span>
        </div>

        <input
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
        />

        <div className="pr-3 text-slate-500">
          <Smartphone className="w-4 h-4" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-medium pl-1 animate-fadeIn">
          {error}
        </p>
      )}
    </div>
  );
};
