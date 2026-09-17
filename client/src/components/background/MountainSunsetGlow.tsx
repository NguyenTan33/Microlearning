import React from 'react';

export const MountainSunsetGlow: React.FC = () => {
  return (
    <div className="absolute top-[28%] left-[91%] -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] pointer-events-none z-10 select-none overflow-visible">
      {/* Soft warm sunset aura behind the mountain flag tower */}
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#FF5722]/20 via-[#FF9800]/25 to-[#FFE082]/30 blur-2xl animate-breath" />
    </div>
  );
};
