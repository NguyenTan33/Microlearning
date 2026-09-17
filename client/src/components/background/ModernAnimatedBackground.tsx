import React from 'react';
import { SilkFlagLightSheen } from './SilkFlagLightSheen';
import { FighterJetsGlint } from './FighterJetsGlint';
import { MountainSunsetGlow } from './MountainSunsetGlow';
import { SunsetEmbersCanvas } from './SunsetEmbersCanvas';

interface ModernAnimatedBackgroundProps {
  windIntensity?: 'gentle' | 'breeze' | 'gust';
}

export const ModernAnimatedBackground: React.FC<ModernAnimatedBackgroundProps> = ({
  windIntensity = 'gust',
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#08100C] select-none">
      {/* 1. Duy nhất một ảnh nền sắc nét toàn màn hình (Không bị lồng ảnh, không viền mờ) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/assets/vietnam-patriotic-bg.jpg')`,
          filter: 'contrast(1.03) brightness(1.01) saturate(1.04)',
        }}
      />

      {/* 2. Ánh sáng lụa cờ lướt nhẹ nhàng */}
      <SilkFlagLightSheen />

      {/* 3. Tia sáng động cơ tiêm kích Su-30 */}
      <FighterJetsGlint />

      {/* 4. Quầng sáng hoàng hôn đỉnh núi */}
      <MountainSunsetGlow />

      {/* 5. Tàn lửa và bụi nắng bay trong gió */}
      <SunsetEmbersCanvas intensity={windIntensity} />

      {/* 6. Lớp bóng mờ điện ảnh nhẹ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 pointer-events-none" />
    </div>
  );
};
