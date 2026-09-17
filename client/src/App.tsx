import React from 'react';
import { ModernAnimatedBackground } from './components/background/ModernAnimatedBackground';
import { MicrolearningHeroShowcase } from './components/showcase/MicrolearningHeroShowcase';
import { AuthActionCard } from './components/auth/AuthActionCard';
import { Video } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#06080F] text-slate-100 flex flex-col justify-center selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background */}
      <ModernAnimatedBackground />

      {/* Mobile Branding Bar (Visible only on screens below lg) */}
      <div className="lg:hidden flex items-center justify-center gap-2.5 py-6 px-4 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/30">
          <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
            <Video className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          MicroLearn
        </span>
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          {/* Left Column: Modern Animated Visuals & Microlearning Graphic Depth */}
          <div className="lg:col-span-7 h-full">
            <MicrolearningHeroShowcase />
          </div>

          {/* Right Column: Action Card Container */}
          <div className="lg:col-span-5 w-full">
            <AuthActionCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
