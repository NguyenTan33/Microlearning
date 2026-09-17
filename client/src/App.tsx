import React from 'react';
import { ModernAnimatedBackground } from './components/background/ModernAnimatedBackground';
import { MicrolearningHeroShowcase } from './components/showcase/MicrolearningHeroShowcase';
import { AuthActionCard } from './components/auth/AuthActionCard';
import { GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#070B17] text-slate-100 flex flex-col justify-center selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Academic Night Background */}
      <ModernAnimatedBackground />

      {/* Mobile Branding Bar (Visible only on screens below lg) */}
      <div className="lg:hidden flex items-center justify-center gap-3 py-6 px-4 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/30">
          <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-cyan-300" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            MicroLearn
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
            Nền tảng học thông minh
          </span>
        </div>
      </div>

      {/* Main Container - 1440px layout */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 lg:py-8 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 w-full items-center">
          {/* Left Column: Education Hero & Interactive Tablet Showcase (~60%) */}
          <div className="lg:col-span-7 xl:col-span-7 h-full">
            <MicrolearningHeroShowcase />
          </div>

          {/* Right Column: Clean Dark Academic Auth Card (~40%) */}
          <div className="lg:col-span-5 xl:col-span-5 w-full flex justify-center">
            <AuthActionCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
