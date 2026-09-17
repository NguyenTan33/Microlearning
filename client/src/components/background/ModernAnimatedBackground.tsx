import React from 'react';

export const ModernAnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#06080F]">
      {/* Dynamic Radial Gradient Mesh Orbs */}
      <div 
        className="absolute -top-[20%] -left-[10%] w-[650px] h-[650px] rounded-full blur-[140px] opacity-40 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.3) 60%, transparent 80%)',
        }}
      />
      
      <div 
        className="absolute top-[40%] -left-[15%] w-[550px] h-[550px] rounded-full blur-[150px] opacity-30 animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(99,102,241,0.2) 65%, transparent 80%)',
        }}
      />

      <div 
        className="absolute -bottom-[20%] left-[30%] w-[700px] h-[700px] rounded-full blur-[160px] opacity-25 animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.75) 0%, rgba(79,70,229,0.3) 60%, transparent 80%)',
        }}
      />

      {/* Subtle modern matrix grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 90%)',
        }}
      />

      {/* Vignette Overlay for Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#06080F] via-transparent to-[#06080F]/80" />
    </div>
  );
};
