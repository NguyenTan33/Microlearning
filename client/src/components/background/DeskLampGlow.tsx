import React from 'react';

export const DeskLampGlow: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden select-none">
      {/* 1. Banker Lamp Glowing Light Bulb Core (approx x: 25%, y: 49%) */}
      <div className="absolute top-[49.5%] left-[25.2%] -translate-x-1/2 -translate-y-1/2">
        {/* Filament hot point */}
        <div className="w-5 h-4 rounded-full bg-[#FFFBEA] blur-xs shadow-[0_0_20px_#FFE082,0_0_40px_#FFB300] animate-pulse" />

        {/* Ambient warm lamp shade halo */}
        <div className="absolute -inset-6 rounded-full bg-gradient-to-b from-[#FFA726]/30 to-[#FFD54F]/50 blur-lg animate-breath" />
      </div>

      {/* 2. Downward Light Cone casting warmth onto Peaked Cap, Books & Map */}
      <div className="absolute top-[50%] left-[13%] w-[380px] h-[350px] opacity-75 pointer-events-none">
        <svg viewBox="0 0 380 350" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="lampCone" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 236, 179, 0.45)" />
              <stop offset="45%" stopColor="rgba(255, 183, 77, 0.22)" />
              <stop offset="85%" stopColor="rgba(255, 152, 0, 0.08)" />
              <stop offset="100%" stopColor="rgba(255, 152, 0, 0)" />
            </linearGradient>
          </defs>

          <polygon points="120,0 160,0 350,350 0,350" fill="url(#lampCone)" />
        </svg>
      </div>

      {/* 3. Soft warm reflection on the wooden desk surface */}
      <div className="absolute bottom-[10%] left-[16%] w-[360px] h-[160px] bg-gradient-to-t from-[#FFA000]/15 via-[#FFB300]/10 to-transparent blur-2xl rounded-full" />
    </div>
  );
};
