import React from 'react';

export const MausoleumFlame: React.FC = () => {
  return (
    <div className="absolute top-[66.2%] left-[77.2%] pointer-events-none z-15 -translate-x-1/2 -translate-y-1/2 select-none">
      {/* Eternal flame hot point */}
      <div className="relative flex items-center justify-center">
        <div className="w-2.5 h-3.5 bg-gradient-to-t from-[#FF3D00] via-[#FFB300] to-[#FFF9C4] rounded-full blur-[1px] animate-pulse shadow-[0_0_8px_#FF9100,0_0_16px_#FF3D00]" />
        <div className="absolute -inset-1.5 bg-[#FF6D00]/40 rounded-full blur-xs animate-ping opacity-60" />
      </div>
    </div>
  );
};
