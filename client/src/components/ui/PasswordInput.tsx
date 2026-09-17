import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  rightAction?: React.ReactNode;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  error,
  disabled = false,
  placeholder = '••••••••••••',
  rightAction,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#FFF3C4]">
          {label}
        </label>
        {rightAction}
      </div>

      <div
        className={`relative flex items-center rounded-xl bg-[#09110B]/85 border transition-all duration-200 focus-within:ring-2 ${
          error
            ? 'border-rose-500/80 focus-within:ring-rose-500/20 focus-within:border-rose-500'
            : 'border-[#C5A059]/40 focus-within:border-[#E6C687] focus-within:ring-[#C5A059]/30'
        }`}
      >
        <div className="pl-3.5 text-[#C5A059]/80">
          <Lock className="w-4 h-4" />
        </div>

        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-stone-400 focus:outline-none disabled:opacity-50 tracking-wider"
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="pr-3.5 text-stone-400 hover:text-[#FFF3C4] transition-colors focus:outline-none cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-medium pl-1">
          {error}
        </p>
      )}
    </div>
  );
};
