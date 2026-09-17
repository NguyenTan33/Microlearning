import React from 'react';

export const ModernAnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#070B17]">
      {/* Ambient Gradient Mesh Orbs */}
      <div 
        className="absolute -top-[15%] -left-[10%] w-[680px] h-[680px] rounded-full blur-[140px] opacity-45 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(79,70,229,0.8) 0%, rgba(124,58,237,0.3) 50%, transparent 80%)',
        }}
      />
      
      <div 
        className="absolute top-[35%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-30 animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, rgba(99,102,241,0.2) 60%, transparent 80%)',
        }}
      />

      <div 
        className="absolute -bottom-[20%] left-[25%] w-[750px] h-[750px] rounded-full blur-[160px] opacity-30 animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(147,51,234,0.7) 0%, rgba(67,56,202,0.35) 60%, transparent 80%)',
        }}
      />

      <div 
        className="absolute top-[20%] -right-[15%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(139,92,246,0.2) 60%, transparent 80%)',
        }}
      />

      {/* Subtle modern academic dot/grid matrix */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, #000 35%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, #000 35%, transparent 85%)',
        }}
      />

      {/* Subtle Academic Chalk Quotes in Corners */}
      {/* Top Right Quote */}
      <div className="hidden xl:block absolute top-6 right-10 text-right select-none opacity-40 hover:opacity-70 transition-opacity">
        <p className="font-handwriting text-lg text-slate-300 tracking-wide">
          “ Tri thức không có giới hạn và bạn có thể bắt đầu ngay hôm nay.” _
        </p>
      </div>

      {/* Bottom Left Quote */}
      <div className="hidden lg:block absolute bottom-5 left-8 select-none -rotate-2 opacity-50 hover:opacity-80 transition-opacity">
        <p className="font-handwriting text-xl text-cyan-300/80 tracking-wide drop-shadow-sm">
          Tri thức hôm nay, Tương lai tươi sáng hơn!
        </p>
      </div>

      {/* Bottom Right Quote */}
      <div className="hidden lg:block absolute bottom-5 right-8 select-none rotate-2 opacity-45 hover:opacity-80 transition-opacity">
        <p className="font-handwriting text-lg text-purple-300/80 tracking-wide drop-shadow-sm">
          Học hôm nay, cho một ngày mai rạng rỡ ♡
        </p>
      </div>

      {/* Vignette Overlay for Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070B17] via-transparent to-[#070B17]/70" />
    </div>
  );
};
