import React from 'react';

export const FighterJetsGlint: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
      {/* Jet 1: Top-Left in formation (Su-30) */}
      <div className="absolute top-[11.2%] left-[80.4%] -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFA726] blur-[1px] animate-pulse opacity-85 shadow-[0_0_8px_#FF9800]" />
        <div className="absolute top-0.5 right-1 w-6 h-[1px] bg-gradient-to-l from-[#FFA726]/70 via-white/50 to-transparent" />
      </div>

      {/* Jet 2: Top-Right lead */}
      <div className="absolute top-[13.6%] left-[86.2%] -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF7043] blur-[1px] animate-ping opacity-75 shadow-[0_0_8px_#FF5722]" />
        <div className="absolute top-0.5 right-1 w-7 h-[1px] bg-gradient-to-l from-[#FF7043]/70 via-white/40 to-transparent" />
      </div>

      {/* Jet 3: Trailing jet */}
      <div className="absolute top-[21.5%] left-[82.6%] -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFA726] blur-[1px] animate-pulse opacity-80 shadow-[0_0_8px_#FF9800]" />
        <div className="absolute top-0.5 right-1 w-6 h-[1px] bg-gradient-to-l from-[#FFA726]/70 via-white/40 to-transparent" />
      </div>
    </div>
  );
};
