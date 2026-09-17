import React from 'react';

export const SilkFlagLightSheen: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-[55%] h-[60%] pointer-events-none z-10 select-none overflow-hidden">
      {/* Soft light shimmer passing across the silk folds of the national flag */}
      <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/8 to-transparent rotate-[-25deg] animate-gold-sweep pointer-events-none opacity-40" />

      {/* Gentle red velvet ambient breathing warmth */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#8E1B1D]/15 via-transparent to-transparent animate-breath pointer-events-none" />
    </div>
  );
};
