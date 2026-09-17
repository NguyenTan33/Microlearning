import React from 'react';

export const SunbeamOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Dynamic Golden God Rays */}
      <div className="absolute -top-32 left-1/4 w-[800px] h-[900px] origin-top-left animate-sunbeam opacity-60">
        <svg viewBox="0 0 800 900" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="godray1" x1="0%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 243, 196, 0.45)" />
              <stop offset="40%" stopColor="rgba(255, 220, 120, 0.22)" />
              <stop offset="85%" stopColor="rgba(255, 200, 80, 0.05)" />
              <stop offset="100%" stopColor="rgba(255, 200, 80, 0)" />
            </linearGradient>
            <linearGradient id="godray2" x1="0%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 250, 220, 0.35)" />
              <stop offset="50%" stopColor="rgba(255, 230, 150, 0.15)" />
              <stop offset="100%" stopColor="rgba(255, 230, 150, 0)" />
            </linearGradient>
          </defs>

          {/* Beam 1 */}
          <polygon points="100,0 180,0 450,900 300,900" fill="url(#godray1)" />
          {/* Beam 2 */}
          <polygon points="220,0 320,0 680,900 520,900" fill="url(#godray2)" />
          {/* Beam 3 */}
          <polygon points="360,0 420,0 800,900 700,900" fill="url(#godray1)" />
        </svg>
      </div>

      {/* Warm Golden Sunlight Bloom around top arch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-400/20 via-amber-500/10 to-transparent blur-3xl rounded-full" />
    </div>
  );
};
