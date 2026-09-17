import React from 'react';
import { ModernAnimatedBackground } from './components/background/ModernAnimatedBackground';
import { MicrolearningHeroShowcase } from './components/showcase/MicrolearningHeroShowcase';
import { InteractiveTablet } from './components/showcase/InteractiveTablet';
import { StudyDeskElements } from './components/showcase/StudyDeskElements';
import { AuthActionCard } from './components/auth/AuthActionCard';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#08100C] text-slate-100 flex flex-col justify-between selection:bg-red-800 selection:text-amber-200 overflow-x-hidden">
      {/* 1. Dynamic Living Background (Patriotic Artwork, Silk Flag Sheen, Jet Fighters Glint, Mountain Sunset Glow, Wind Embers) */}
      <ModernAnimatedBackground windIntensity="gust" />

      {/* 2. Main Stage Content Grid */}
      <main className="relative z-10 w-full max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 xl:gap-8 items-center">
          {/* Left Column: Platform Branding & Golden Feature Cards */}
          <section className="lg:col-span-4 xl:col-span-4 h-full flex flex-col justify-center">
            <MicrolearningHeroShowcase />
          </section>

          {/* Center Column: Interactive Learning Tablet */}
          <section className="lg:col-span-4 xl:col-span-4 flex flex-col items-center justify-center my-4 lg:my-0">
            <InteractiveTablet />
          </section>

          {/* Right Column: Arched Military Crest Auth Card */}
          <section className="lg:col-span-4 xl:col-span-4 flex flex-col items-center lg:items-end justify-center">
            <AuthActionCard />
          </section>
        </div>
      </main>

      {/* 3. Bottom Minimal Subtle Accent */}
      <footer className="relative z-20 w-full pb-3">
        <StudyDeskElements />
      </footer>
    </div>
  );
};

export default App;
