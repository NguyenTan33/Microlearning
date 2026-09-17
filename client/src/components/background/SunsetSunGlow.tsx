import React from 'react';

export const SunsetSunGlow: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* 1. Setting Sun Radiant Core (positioned at horizon where the sun sits in the image) */}
      <div className="absolute top-[44%] left-[70%] -translate-x-1/2 -translate-y-1/2">
        {/* Core hot glowing sun aura */}
        <div className="w-16 h-16 rounded-full bg-[#FFF2B2] blur-md shadow-[0_0_50px_#FFA028,0_0_100px_#FF5E1E] opacity-90 animate-pulse" />

        {/* Expanding pulsating warm flare ring */}
        <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-[#FF5E1E]/40 via-[#FFA028]/30 to-[#FFE494]/50 blur-2xl animate-breath" />

        {/* Broad twilight sunset ambient glow spreading through the window */}
        <div className="absolute -inset-48 rounded-full bg-gradient-to-b from-[#FF7A29]/25 via-[#E63946]/15 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* 2. Low-angle Sunset God Rays radiating across Ba Dinh Square */}
      <div className="absolute top-[35%] left-[55%] w-[650px] h-[450px] pointer-events-none opacity-45">
        <svg viewBox="0 0 650 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="sunsetRay1" x1="100%" y1="20%" x2="0%" y2="80%">
              <stop offset="0%" stopColor="rgba(255, 230, 160, 0.4)" />
              <stop offset="50%" stopColor="rgba(255, 140, 50, 0.15)" />
              <stop offset="100%" stopColor="rgba(255, 80, 20, 0)" />
            </linearGradient>
            <linearGradient id="sunsetRay2" x1="100%" y1="15%" x2="10%" y2="90%">
              <stop offset="0%" stopColor="rgba(255, 200, 120, 0.35)" />
              <stop offset="60%" stopColor="rgba(240, 100, 30, 0.1)" />
              <stop offset="100%" stopColor="rgba(240, 60, 20, 0)" />
            </linearGradient>
          </defs>

          {/* Ray Beams */}
          <polygon points="500,100 520,90 120,400 60,400" fill="url(#sunsetRay1)" />
          <polygon points="490,110 510,100 200,450 150,450" fill="url(#sunsetRay2)" />
          <polygon points="510,95 530,85 30,320 0,330" fill="url(#sunsetRay1)" />
        </svg>
      </div>

      {/* 3. Golden Hour Warm Window Reflection Sheen */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-[#FF7A29]/10 via-[#FFA028]/5 to-transparent pointer-events-none" />
    </div>
  );
};
