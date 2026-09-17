import React from 'react';

export const StudyDeskElements: React.FC = () => {
  return (
    <div className="w-full relative z-10 select-none py-1 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 px-5 py-1.5 rounded-full bg-black/60 border border-[#C5A059]/40 backdrop-blur-md shadow-lg text-center">
          <span className="text-amber-400 font-bold text-xs">★</span>
          <span className="text-xs font-serif font-bold text-[#FFF3C4] tracking-wider">
            Vì Tổ Quốc • Vì Nhân Dân — MicroLearn
          </span>
        </div>
      </div>
    </div>
  );
};
